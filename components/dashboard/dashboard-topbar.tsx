import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { ChevronRight, Search, Bell } from "lucide-react";

interface DashboardTopbarProps {
  title: string;
  subtitle: string;
}

export const DashboardTopbar = ({ title, subtitle }: DashboardTopbarProps) => {
  return (
    <header className="sticky top-0 z-20 h-[81px] border-b border-default-200 bg-white px-4 py-3.5">
      <div className="flex flex-col gap-4 items-center lg:flex-row lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold leading-tight text-foreground">
            {title.split("Sahara!")[0]}
            <span className="text-[#022279]">Sahara!</span>
          </h1>
          <p className="mt-1 text-xs font-medium text-default-700">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-center">
          <Button isIconOnly radius="full" size="sm" variant="light">
            <Search size={20} />
          </Button>
          <Divider className="h-7" orientation="vertical" />
          <Badge color="danger" content="" placement="top-right" shape="circle">
            <Button isIconOnly radius="full" size="sm" variant="light">
              <Bell size={20} />
            </Button>
          </Badge>
          <Divider className="h-7" orientation="vertical" />
          <div className="flex items-center gap-3 rounded-xl px-1 py-1">
            <Avatar
              className="bg-primary/10"
              name="Sahara P"
              size="md"
              src="https://i.pravatar.cc/120?img=12"
            />
            <div className="leading-tight">
              <p className="text-base font-semibold text-foreground">
                Sahara P
              </p>
              <p className="text-sm text-default-500">@saharap</p>
            </div>
          </div>
          <Button isIconOnly radius="full" size="sm" variant="light">
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
};
