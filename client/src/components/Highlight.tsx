"use client";

import React from "react";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const Highlight = ({ text, term }: { text: string; term: string }) => {
  if (!term) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="bg-secondary-200 text-primary-800">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

export default Highlight;