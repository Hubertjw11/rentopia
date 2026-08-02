"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/state/redux";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { List, Map as MapIcon } from "lucide-react";
import FiltersBar from "./FiltersBar";
import FiltersFull from "./FiltersFull";
import { cleanParams } from "@/lib/utils";
import { setFilters } from "@/state";
import Map from "./Map";
import Listings from "./Listings";

const SearchPage = () => {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const isFiltersFullOpen = useAppSelector(
    (state) => state.global.isFiltersFullOpen,
  );
  const [mobilePane, setMobilePane] = useState<"list" | "map">("list");

  useEffect(() => {
    const initialFilters = Array.from(searchParams.entries()).reduce(
      (acc: any, [key, value]) => {
        if (key === "priceRange" || key === "squareFeet") {
          acc[key] = value.split(",").map((v) => (v === "" ? null : Number(v)));
        } else if (key === "coordinates") {
          acc[key] = value.split(",").map(Number);
        } else {
          acc[key] = value === "any" ? null : value;
        }

        return acc;
      },
      {},
    );

    const cleanedFilters = cleanParams(initialFilters);
    dispatch(setFilters(cleanedFilters));
  }, []);

  return (
    <div
      className="w-full mx-auto px-5 flex flex-col"
      style={{
        height: `calc(100dvh - ${NAVBAR_HEIGHT}px)`,
      }}
    >
      <FiltersBar />
      <div className="relative flex justify-between flex-1 overflow-hidden gap-3 mb-5">
        <div
          className={`h-full overflow-auto transition-all duration-300 ease-in-out ${
            isFiltersFullOpen
              ? "w-full opacity-100 visible md:w-3/12"
              : "w-0 opacity-0 invisible"
          }`}
        >
          <FiltersFull />
        </div>

        <div
          className={`h-full w-full md:block md:w-auto md:basis-5/12 md:grow ${
            !isFiltersFullOpen && mobilePane === "map" ? "block" : "hidden"
          }`}
        >
          <Map />
        </div>

        <div
          className={`h-full w-full overflow-y-auto md:block md:w-auto md:basis-4/12 ${
            !isFiltersFullOpen && mobilePane === "list" ? "block" : "hidden"
          }`}
        >
          <Listings />
        </div>

        {!isFiltersFullOpen && (
          <button
            type="button"
            onClick={() =>
              setMobilePane((pane) => (pane === "list" ? "map" : "list"))
            }
            className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-lg md:hidden"
          >
            {mobilePane === "list" ? (
              <>
                <MapIcon className="h-4 w-4" />
                Map
              </>
            ) : (
              <>
                <List className="h-4 w-4" />
                List
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
