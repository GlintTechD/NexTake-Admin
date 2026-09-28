interface NexTakeLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "header";
  lightMode?: boolean;
}

export default function NexTakeLogo({
  className = "",
  size = "md",
  lightMode = false,
}: NexTakeLogoProps) {
  const heightClasses = {
    sm: "h-9 sm:h-10",
    md: "h-10 sm:h-12",
    lg: "h-14 sm:h-16",
    xl: "h-16 sm:h-20",
    header: "h-10 sm:h-16 lg:h-20",
  };

  const maxWidthClasses = {
    sm: "max-w-[200px]",
    md: "max-w-[260px] sm:max-w-[300px]",
    lg: "max-w-[320px] sm:max-w-[380px]",
    xl: "max-w-[400px] sm:max-w-[480px]",
    header: "max-w-[320px] sm:max-w-[420px] lg:max-w-[520px]",
  };

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* Authentic user brand header image */}
      <img
        src="/header.png"
        onError={(e) => {
          // Graceful fallback to vector logo if needed
          const target = e.currentTarget;
          if (!target.src.endsWith("/header.svg")) {
            target.src = "/header.svg";
          }
        }}
        alt="NexTake - Technology News. Intelligently Curated."
        className={`${heightClasses[size]} ${maxWidthClasses[size]} w-auto object-contain transition-transform hover:opacity-95 ${
          lightMode ? "brightness-0 invert-0 contrast-125" : ""
        }`}
      />
    </div>
  );
}


