import { cleanParams, createNewUserInDatabase, withToast } from "@/lib/utils";
import {
  Manager,
  Payment,
  PaymentMethod,
  Property,
  PropertyPage,
  PropertyMarker,
  Tenant,
  Lease,
  Application,
  NotificationPage,
  LeaseWithTenant,
  ApplicationRow,
  Conversation,
  ConversationRow,
  Message,
  MessagePage,
  MessageSearchPage,
  ReviewRow,
  Review,
} from "@/types/model";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { FiltersState } from ".";

type PropertyFilters = Partial<FiltersState> & {
  favoriteIds?: number[];
  page?: number;
  limit?: number;
};

const propertyParams = (filters: PropertyFilters) =>
  cleanParams({
    location: filters.location,
    priceMin: filters.priceRange?.[0],
    priceMax: filters.priceRange?.[1],
    beds: filters.beds,
    baths: filters.baths,
    propertyType: filters.propertyType,
    areaSqmMin: filters.areaSqm?.[0],
    areaSqmMax: filters.areaSqm?.[1],
    amenities: filters.amenities?.join(","),
    availableFrom: filters.availableFrom,
    favoriteIds: filters.favoriteIds?.join(","),
    latitude: filters.coordinates?.[1],
    longitude: filters.coordinates?.[0],
    page: filters.page,
    limit: filters.limit,
  });

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const session = await fetchAuthSession();
      const { idToken } = session.tokens ?? {};
      if (idToken) {
        headers.set("Authorization", `Bearer ${idToken}`);
      }
      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: [
    "Managers",
    "Tenants",
    "Properties",
    "PropertyDetails",
    "Leases",
    "Payments",
    "Applications",
    "PaymentMethods",
    "Notifications",
    "Conversations",
    "Messages",
    "Reviews",
  ],
  endpoints: (build) => ({
    getAuthUser: build.query<User, void>({
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          const session = await fetchAuthSession();
          const { idToken } = session.tokens ?? {};
          const user = await getCurrentUser();
          const userRole = idToken?.payload["custom:role"] as string;

          const endpoint =
            userRole === "manager"
              ? `/managers/${user.userId}`
              : `/tenants/${user.userId}`;

          let userDetailsResponse = await fetchWithBQ(endpoint);

          // if user doens't exist, create new user
          if (
            userDetailsResponse.error &&
            userDetailsResponse.error.status === 404
          ) {
            userDetailsResponse = await createNewUserInDatabase(
              user,
              idToken,
              userRole,
              fetchWithBQ,
            );
          }

          return {
            data: {
              cognitoInfo: { ...user },
              userInfo: userDetailsResponse.data as Tenant | Manager,
              userRole,
            },
          };
        } catch (error: any) {
          return { error: error.message || "Could not fetch User data" };
        }
      },
    }),

    // property related endpoints
    getProperties: build.query<PropertyPage, PropertyFilters>({
      query: (filters) => ({
        url: "properties",
        params: propertyParams(filters),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.properties.map(({ id }) => ({
                type: "Properties" as const,
                id,
              })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch properties.",
        });
      },
    }),

    getPropertyMarkers: build.query<PropertyMarker[], PropertyFilters>({
      query: (filters) => ({
        url: "properties/markers",
        params: propertyParams(filters),
      }),
      providesTags: [{ type: "Properties", id: "LIST" }],
    }),

    getProperty: build.query<Property, number>({
      query: (id) => `properties/${id}`,
      providesTags: (result, error, id) => [{ type: "PropertyDetails", id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load property details.",
        });
      },
    }),

    // tenant related endpoints
    getTenant: build.query<Tenant, string>({
      query: (cognitoId) => `tenants/${cognitoId}`,
      providesTags: (result) => [{ type: "Tenants", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load tenant profile.",
        });
      },
    }),

    getCurrentResidences: build.query<Property[], string>({
      query: (cognitoId) => `tenants/${cognitoId}/current-residences`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as const, id })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch current residences.",
        });
      },
    }),

    updateTenantSettings: build.mutation<
      Tenant,
      { cognitoId: string } & Partial<Tenant>
    >({
      query: ({ cognitoId, ...updatedTenant }) => ({
        url: `tenants/${cognitoId}`,
        method: "PUT",
        body: updatedTenant,
      }),
      invalidatesTags: (result) => [{ type: "Tenants", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully",
          error: "Failed to update settings.",
        });
      },
    }),

    addFavoriteProperty: build.mutation<
      Tenant,
      { cognitoId: string; propertyId: number }
    >({
      query: ({ cognitoId, propertyId }) => ({
        url: `tenants/${cognitoId}/favorites/${propertyId}`,
        method: "POST",
      }),
      invalidatesTags: (result) => [
        { type: "Tenants", id: result?.id },
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Added to favorites!",
          error: "Failed to add to favorites.",
        });
      },
    }),

    removeFavoriteProperty: build.mutation<
      Tenant,
      { cognitoId: string; propertyId: number }
    >({
      query: ({ cognitoId, propertyId }) => ({
        url: `tenants/${cognitoId}/favorites/${propertyId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result) => [
        { type: "Tenants", id: result?.id },
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Remove from favorites!",
          error: "Failed to remove from favorites.",
        });
      },
    }),

    // manager related endpoints
    getManagerProperties: build.query<Property[], string>({
      query: (cognitoId) => `managers/${cognitoId}/properties`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as const, id })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load manager profile.",
        });
      },
    }),

    updateManagerSettings: build.mutation<
      Manager,
      { cognitoId: string } & Partial<Manager>
    >({
      query: ({ cognitoId, ...updatedManager }) => ({
        url: `managers/${cognitoId}`,
        method: "PUT",
        body: updatedManager,
      }),
      invalidatesTags: (result) => [{ type: "Managers", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error: "Failed to update settings.",
        });
      },
    }),

    createProperty: build.mutation<Property, FormData>({
      query: (newProperty) => ({
        url: `properties`,
        method: "POST",
        body: newProperty,
      }),
      invalidatesTags: (result) => [
        { type: "Properties", id: "LIST" },
        { type: "Managers", id: result?.manager?.id },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property created successfully!",
          error: "Failed to create property.",
        });
      },
    }),

    updateProperty: build.mutation<Property, { id: number; body: FormData }>({
      query: ({ id, body }) => ({
        url: `properties/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "PropertyDetails", id },
        { type: "Properties", id },
        { type: "Properties", id: "LIST" },
        { type: "Managers", id: result?.manager?.id },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property updated successfully!",
          error: "Failed to update property.",
        });
      },
    }),

    // lease related endpoints
    getLeases: build.query<Lease[], void>({
      query: () => "leases",
      providesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch leases.",
        });
      },
    }),

    getPropertyLeases: build.query<LeaseWithTenant[], number>({
      query: (propertyId) => `properties/${propertyId}/leases`,
      providesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch property leases.",
        });
      },
    }),

    getPropertyPayments: build.query<Payment[], number>({
      query: (propertyId) => `properties/${propertyId}/payments`,
      providesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch payment info.",
        });
      },
    }),

    getPayments: build.query<Payment[], number>({
      query: (leaseId) => `leases/${leaseId}/payments`,
      providesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch payment info.",
        });
      },
    }),

    // applications related endpoints
    getApplications: build.query<
      Application[],
      { userId?: string; userType?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.userId) {
          queryParams.append("userId", params.userId.toString());
        }
        if (params.userType) {
          queryParams.append("userType", params.userType);
        }

        return `applications?${queryParams.toString()}`;
      },
      providesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch applications.",
        });
      },
    }),

    updateApplicationStatus: build.mutation<
      ApplicationRow,
      { id: number; status: string }
    >({
      query: ({ id, status }) => ({
        url: `applications/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["Applications", "Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application updated successfully!",
          error: "Failed to update application settings.",
        });
      },
    }),

    createApplication: build.mutation<ApplicationRow, Partial<Application>>({
      query: (body) => ({
        url: `applications`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application created successfully!",
          error: "Failed to create applications.",
        });
      },
    }),

    // payment method endpoints
    getPaymentMethods: build.query<PaymentMethod[], string>({
      query: (cognitoId) => `tenants/${cognitoId}/payment-methods`,
      providesTags: ["PaymentMethods"],
    }),

    createSetupIntent: build.mutation<{ clientSecret: string }, string>({
      query: (cognitoId) => ({
        url: `tenants/${cognitoId}/payment-methods/setup-intent`,
        method: "POST",
      }),
    }),

    savePaymentMethod: build.mutation<
      PaymentMethod,
      { cognitoId: string; stripePaymentMethodId: string }
    >({
      query: ({ cognitoId, stripePaymentMethodId }) => ({
        url: `tenants/${cognitoId}/payment-methods`,
        method: "POST",
        body: { stripePaymentMethodId },
      }),
      invalidatesTags: ["PaymentMethods"],
    }),

    setDefaultPaymentMethod: build.mutation<
      PaymentMethod[],
      { cognitoId: string; id: number }
    >({
      query: ({ cognitoId, id }) => ({
        url: `tenants/${cognitoId}/payment-methods/${id}/default`,
        method: "PUT",
      }),
      invalidatesTags: ["PaymentMethods"],
    }),

    deletePaymentMethod: build.mutation<
      { message: string },
      { cognitoId: string; id: number }
    >({
      query: ({ cognitoId, id }) => ({
        url: `tenants/${cognitoId}/payment-methods/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PaymentMethods"],
    }),

    // notification related endpoints
    getNotifications: build.query<NotificationPage, void>({
      query: () => "notifications",
      providesTags: ["Notifications"],
    }),

    // Separate from getNotifications on purpose: the bell and this page sit at
    // different window sizes, and one shared entry would leave them refetching
    // each other's args. The constant cache key is safe only while this has a
    // single subscriber — don't wire up a second one at a different limit.
    getNotificationHistory: build.query<NotificationPage, number>({
      query: (limit) => ({ url: "notifications", params: { limit } }),
      serializeQueryArgs: ({ endpointName }) => endpointName,
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
      providesTags: ["Notifications"],
    }),

    getUnreadNotificationCount: build.query<{ count: number }, void>({
      query: () => "notifications/unread-count",
      providesTags: ["Notifications"],
    }),

    markNotificationRead: build.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsRead: build.mutation<{ message: string }, void>({
      query: () => ({
        url: "notifications/read-all",
        method: "PUT",
      }),
      invalidatesTags: ["Notifications"],
    }),

    // messaging related endpoints
    getConversations: build.query<Conversation[], void>({
      query: () => "conversations",
      providesTags: ["Conversations"],
    }),

    getUnreadMessageCount: build.query<{ count: number }, void>({
      query: () => "conversations/unread-count",
      providesTags: ["Conversations"],
    }),

    getMessages: build.query<
      MessagePage,
      { conversationId: number; limit: number }
    >({
      query: ({ conversationId, limit }) => ({
        url: `conversations/${conversationId}/messages`,
        params: { limit },
      }),
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}-${queryArgs.conversationId}`,
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.limit !== previousArg?.limit,
      providesTags: ["Messages"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          return;
        }
        dispatch(api.util.invalidateTags(["Conversations"]));
      },
    }),

    startConversation: build.mutation<
      ConversationRow,
      { propertyId: number; tenantCognitoId?: string }
    >({
      query: (body) => ({ url: "conversations", method: "POST", body }),
      invalidatesTags: ["Conversations"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Could not open the conversation.",
        });
      },
    }),

    sendMessage: build.mutation<
      Message,
      {
        conversationId: number;
        body: string;
        replyToId?: number;
        attachment?: File;
      }
    >({
      query: ({ conversationId, body, replyToId, attachment }) => {
        const url = `conversations/${conversationId}/messages`;
        if (!attachment) {
          return { url, method: "POST", body: { body, replyToId } };
        }

        const form = new FormData();
        form.append("body", body);
        if (replyToId !== undefined) form.append("replyToId", String(replyToId));
        form.append("attachment", attachment);
        return { url, method: "POST", body: form };
      },
      invalidatesTags: ["Messages", "Conversations"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Message failed to send." });
      },
    }),

    editMessage: build.mutation<
      Message,
      { conversationId: number; messageId: number; body: string }
    >({
      query: ({ conversationId, messageId, body }) => ({
        url: `conversations/${conversationId}/messages/${messageId}`,
        method: "PATCH",
        body: { body },
      }),
      invalidatesTags: ["Messages", "Conversations"],
      async onQueryStarted(
        { conversationId, messageId, body },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          api.util.updateQueryData(
            "getMessages",
            { conversationId, limit: 0 },
            (draft) => {
              const target = draft.messages.find((m) => m.id === messageId);
              if (target) {
                target.body = body;
                target.isEdited = true;
              }
            },
          ),
        );

        try {
          await withToast(queryFulfilled, {
            error: "Could not save the edit.",
          });
        } catch {
          patch.undo();
        }
      },
    }),

    searchMessages: build.query<
      MessageSearchPage,
      { q: string; conversationId?: number }
    >({
      query: ({ q, conversationId }) => ({
        url: "conversations/search",
        params: conversationId === undefined ? { q } : { q, conversationId },
      }),
      providesTags: ["Messages"],
    }),

    deleteMessages: build.mutation<
      { count: number },
      { conversationId: number; ids: number[]; scope: "me" | "everyone" }
    >({
      query: ({ conversationId, ...body }) => ({
        url: `conversations/${conversationId}/messages/delete`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Messages", "Conversations"],
      async onQueryStarted(
        { conversationId, ids, scope },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          api.util.updateQueryData(
            "getMessages",
            { conversationId, limit: 0 },
            (draft) => {
              if (scope === "me") {
                draft.messages = draft.messages.filter(
                  (m) => !ids.includes(m.id),
                );
                return;
              }
              for (const message of draft.messages) {
                if (ids.includes(message.id)) {
                  message.isDeleted = true;
                  message.body = "";
                }
              }
            },
          ),
        );

        try {
          await withToast(queryFulfilled, {
            error: "Could not delete those messages.",
          });
        } catch {
          patch.undo();
        }
      },
    }),

    deleteConversation: build.mutation<{ message: string }, number>({
      query: (conversationId) => ({
        url: `conversations/${conversationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Conversations", "Messages"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Conversation deleted",
          error: "Could not delete the conversation.",
        });
      },
    }),

    // review related endpoints
    getReviews: build.query<Review[], number>({
      query: (propertyId) => `properties/${propertyId}/reviews`,
      providesTags: ["Reviews"],
    }),

    upsertReview: build.mutation<
      ReviewRow,
      { propertyId: number; rating: number; comment?: string }
    >({
      query: ({ propertyId, ...body }) => ({
        url: `properties/${propertyId}/reviews`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { propertyId }) => [
        "Reviews",
        { type: "PropertyDetails", id: propertyId },
        { type: "Properties", id: propertyId },
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Review saved",
          error: "Could not save your review.",
        });
      },
    }),

    deleteReview: build.mutation<
      { message: string },
      { id: number; propertyId: number }
    >({
      query: ({ id }) => ({ url: `reviews/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { propertyId }) => [
        "Reviews",
        { type: "PropertyDetails", id: propertyId },
        { type: "Properties", id: propertyId },
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Review removed",
          error: "Could not remove your review.",
        });
      },
    }),
  }),
});

export const {
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
  useUpdateManagerSettingsMutation,
  useGetPropertiesQuery,
  useGetPropertyMarkersQuery,
  useGetPropertyQuery,
  useGetCurrentResidencesQuery,
  useGetManagerPropertiesQuery,
  useCreatePropertyMutation,
  useUpdatePropertyMutation,
  useGetTenantQuery,
  useAddFavoritePropertyMutation,
  useRemoveFavoritePropertyMutation,
  useGetLeasesQuery,
  useGetPropertyLeasesQuery,
  useGetPropertyPaymentsQuery,
  useGetPaymentsQuery,
  useGetApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useCreateApplicationMutation,
  useGetPaymentMethodsQuery,
  useCreateSetupIntentMutation,
  useSavePaymentMethodMutation,
  useSetDefaultPaymentMethodMutation,
  useDeletePaymentMethodMutation,
  useGetNotificationsQuery,
  useGetNotificationHistoryQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetConversationsQuery,
  useGetUnreadMessageCountQuery,
  useGetMessagesQuery,
  useStartConversationMutation,
  useSendMessageMutation,
  useDeleteConversationMutation,
  useDeleteMessagesMutation,
  useSearchMessagesQuery,
  useEditMessageMutation,
  useGetReviewsQuery,
  useUpsertReviewMutation,
  useDeleteReviewMutation,
} = api;
