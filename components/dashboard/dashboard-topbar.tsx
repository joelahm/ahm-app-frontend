"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import { ChevronRight, Search, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-context";

interface DashboardTopbarProps {
  title: string;
  subtitle: string;
}

export const DashboardTopbar = ({ title, subtitle }: DashboardTopbarProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, session } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const displayName =
    [session?.user?.firstName, session?.user?.lastName]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .trim() ||
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0]?.trim() ||
    "User";
  const emailAddress = session?.user?.email ?? "user@example.com";
  const avatarUrl = (() => {
    const rawAvatarUrl = session?.user?.avatarUrl?.trim();

    if (!rawAvatarUrl) {
      return undefined;
    }

    if (/^https?:\/\//i.test(rawAvatarUrl)) {
      return rawAvatarUrl;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
    const normalizedPath = rawAvatarUrl.replace(/^\/+/, "");

    return baseUrl ? `${baseUrl}/${normalizedPath}` : rawAvatarUrl;
  })();
  const headingTitle = title.includes(",")
    ? `${title.split(",")[0]}, ${displayName}!`
    : `${title} ${displayName}!`;

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("?")[0].split("/").filter(Boolean);

    if (!segments.length) {
      return [];
    }

    const formatSegment = (segment: string) => {
      if (!segment) {
        return "";
      }

      if (/^\d+$/.test(segment) || segment.length > 24) {
        return "Details";
      }

      return segment
        .split("-")
        .filter(Boolean)
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" ");
    };

    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const label =
        index === 0 ? "Dashboard" : formatSegment(decodeURIComponent(segment));

      return {
        href,
        isLast: index === segments.length - 1,
        label,
      };
    });
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 h-[81px] border-b border-default-200 bg-white px-4 py-3.5">
      <div className="flex flex-col gap-4 items-center lg:flex-row lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold leading-tight text-foreground">
            {headingTitle.split(`${displayName}!`)[0]}
            <span className="text-[#022279]">{displayName}!</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs font-medium text-default-700">
            {breadcrumbs.length ? (
              breadcrumbs.map((item) =>
                item.isLast ? (
                  <span key={item.href} className="text-default-700">
                    {item.label}
                  </span>
                ) : (
                  <div key={item.href} className="flex items-center gap-1">
                    <Link className="hover:text-[#022279]" href={item.href}>
                      {item.label}
                    </Link>
                    <ChevronRight size={12} />
                  </div>
                ),
              )
            ) : (
              <span>{subtitle}</span>
            )}
          </div>
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
              name={displayName}
              size="md"
              src={avatarUrl}
            />
            <div className="leading-tight">
              <p className="text-base font-semibold text-foreground">
                {displayName}
              </p>
              <p className="text-sm text-default-500">{emailAddress}</p>
            </div>
          </div>
          <Dropdown placement="bottom-end" onOpenChange={setIsProfileMenuOpen}>
            <DropdownTrigger>
              <Button isIconOnly radius="full" size="sm" variant="light">
                <ChevronRight
                  className={`transition-transform duration-200 ${isProfileMenuOpen ? "rotate-90" : ""}`}
                  size={18}
                />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile actions">
              <DropdownItem key="logout" color="danger" onPress={handleLogout}>
                Logout
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </header>
  );
};
