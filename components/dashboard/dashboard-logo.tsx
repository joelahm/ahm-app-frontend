import clsx from "clsx";
import Image from "next/image";

interface DashboardLogoProps {
  className?: string;
  compact?: boolean;
}

export const DashboardLogo = ({
  className,
  compact = false,
}: DashboardLogoProps) => {
  return (
    <div
      className={clsx(
        "flex items-center",
        compact ? "justify-center" : "gap-2.5",
        className,
      )}
    >
      <div className="flex items-end gap-[2px]">
        <Image
          alt="AHM Logo"
          height={35}
          src={"/images/ahm-logo.svg"}
          width={72}
        />
      </div>
    </div>
  );
};
