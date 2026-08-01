import clsx from "clsx";

const MAP = {
  maths:   { label: "Mathematics", color: "bg-amber-100 text-amber-800 border-amber-200" },
  science: { label: "Science",     color: "bg-teal-100  text-teal-800  border-teal-200"  },
  general: { label: "General",     color: "bg-blue-100  text-blue-800  border-blue-200"  },
};

export default function SubjectBadge({ subject }: { subject: "maths" | "science" | "general" }) {
  const { label, color } = MAP[subject];
  return (
    <span className={clsx("inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border", color)}>
      {label}
    </span>
  );
}
