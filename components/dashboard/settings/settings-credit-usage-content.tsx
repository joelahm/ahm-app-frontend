"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Progress } from "@heroui/progress";
import { Tab, Tabs } from "@heroui/tabs";
import {
  HardDrive,
  ImageIcon,
  List,
  ScanSearch,
  Search,
  Sparkles,
} from "lucide-react";

import {
  DashboardDataTable,
  type DashboardDataTableColumn,
} from "@/components/dashboard/dashboard-data-table";
import { ManageCreditAllocationModal } from "@/components/dashboard/settings/manage-credit-allocation-modal";

interface CreditUsageRow {
  address: string;
  allocated: number;
  clientName: string;
  id: string;
  lastUsage: string;
  used: number;
}

const CREDIT_USAGE_ROWS: CreditUsageRow[] = [
  {
    address: "123 ABC, Street, 12345",
    allocated: 500,
    clientName: "Mr Ricardo Camprodon",
    id: "credit-1",
    lastUsage: "2 days ago",
    used: 320,
  },
  {
    address: "123 ABC, Street, 12345",
    allocated: 500,
    clientName: "Mr Sven Putnis",
    id: "credit-2",
    lastUsage: "Jul. 12, 2024",
    used: 320,
  },
  {
    address: "123 ABC, Street, 12345",
    allocated: 500,
    clientName: "Mr Ricardo Camprodon",
    id: "credit-3",
    lastUsage: "Jul. 12, 2024",
    used: 320,
  },
  {
    address: "123 ABC, Street, 12345",
    allocated: 500,
    clientName: "Mr Sven Putnis",
    id: "credit-4",
    lastUsage: "Jul. 12, 2024",
    used: 320,
  },
  {
    address: "1234567890",
    allocated: 500,
    clientName: "Mr Ricardo Camprodon",
    id: "credit-5",
    lastUsage: "Jul. 12, 2024",
    used: 320,
  },
  {
    address: "123 ABC, Street, 12345",
    allocated: 500,
    clientName: "Mr Sven Putnis",
    id: "credit-6",
    lastUsage: "Jul. 12, 2024",
    used: 320,
  },
  {
    address: "123 ABC, Street, 12345",
    allocated: 500,
    clientName: "Mr Ricardo Camprodon",
    id: "credit-7",
    lastUsage: "Jul. 12, 2024",
    used: 320,
  },
  {
    address: "123 ABC, Street, 12345",
    allocated: 500,
    clientName: "Mr Sven Putnis",
    id: "credit-8",
    lastUsage: "Jul. 12, 2024",
    used: 320,
  },
  {
    address: "1234567890",
    allocated: 500,
    clientName: "Mr Ricardo Camprodon",
    id: "credit-9",
    lastUsage: "Jul. 12, 2024",
    used: 320,
  },
  {
    address: "123 ABC, Street, 12345",
    allocated: 500,
    clientName: "Mr Sven Putnis",
    id: "credit-10",
    lastUsage: "Jul. 12, 2024",
    used: 320,
  },
];

const headerCellClass = "bg-[#F9FAFB] text-xs font-medium text-[#111827]";

export const SettingsCreditUsageContent = () => {
  const [activeTab, setActiveTab] = useState("scan-credits");
  const [currentPage, setCurrentPage] = useState(2);
  const [isManageAllocationOpen, setIsManageAllocationOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return CREDIT_USAGE_ROWS;
    }

    return CREDIT_USAGE_ROWS.filter((row) =>
      [row.clientName, row.address, row.lastUsage].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [searchValue]);

  const columns = useMemo<DashboardDataTableColumn<CreditUsageRow>[]>(
    () => [
      {
        className: headerCellClass,
        key: "clientName",
        label: "Client Name",
        renderCell: (item) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#1F2937]">
              {item.clientName}
            </p>
            <p className="text-xs text-[#9CA3AF]">{item.address}</p>
          </div>
        ),
      },
      {
        className: headerCellClass,
        key: "usage",
        label: "Usage",
        renderCell: (item) => (
          <div className="min-w-[120px] space-y-1">
            <p className="text-sm leading-none text-[#374151]">
              {item.used}
              <span className="font-medium text-[#98A2B3]">
                {" "}
                / {item.allocated}
              </span>
            </p>
            <Progress
              aria-label={`${item.clientName} usage`}
              className="w-[70px]"
              classNames={{
                base: "max-w-[70px]",
                indicator: "rounded-full bg-[#0B2A84]",
                track: "h-2.5 rounded-full bg-[#EEF2F7]",
              }}
              radius="full"
              size="md"
              value={(item.used / item.allocated) * 100}
            />
          </div>
        ),
      },
      {
        className: headerCellClass,
        key: "allocated",
        label: "Allocated",
        renderCell: (item) => (
          <span className="text-sm text-[#374151]">{item.allocated}</span>
        ),
      },
      {
        className: headerCellClass,
        key: "lastUsage",
        label: "Last Usage",
        renderCell: (item) => (
          <span className="text-sm text-[#4B5563]">{item.lastUsage}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <Tabs
        aria-label="Credit usage tabs"
        classNames={{
          base: "w-fit",
          cursor: "bg-white shadow-none",
          panel: "hidden",
          tab: "h-10 px-4 data-[selected=true]:text-[#111827]",
          tabContent:
            "group-data-[selected=true]:text-[#111827] text-[#4B5563] font-medium",
          tabList: "gap-1 rounded-xl bg-[#F3F4F6] p-1",
        }}
        color="primary"
        radius="md"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key))}
      >
        <Tab
          key="scan-credits"
          title={
            <div className="flex items-center gap-2">
              <ScanSearch size={16} />
              <span>Scan Credits</span>
            </div>
          }
        />
        <Tab
          key="ai-credits"
          title={
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span>AI Credits</span>
            </div>
          }
        />
        <Tab
          key="media-storage"
          title={
            <div className="flex items-center gap-2">
              <ImageIcon size={16} />
              <HardDrive size={16} />
              <span>Media Storage</span>
            </div>
          }
        />
      </Tabs>

      {activeTab === "scan-credits" ? (
        <DashboardDataTable
          ariaLabel="Credit usage table"
          columns={columns}
          currentPage={currentPage}
          getRowKey={(item) => item.id}
          headerRight={
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Button startContent={<List size={18} />} variant="bordered">
                Show 10
              </Button>
              <Input
                className="w-full sm:w-[202px]"
                placeholder="Search here"
                radius="md"
                startContent={<Search className="text-default-400" size={18} />}
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <Button
                className="bg-primary text-white"
                onPress={() => setIsManageAllocationOpen(true)}
              >
                Manage Credits
              </Button>
            </div>
          }
          pageSize={10}
          rows={filteredRows}
          showPagination={true}
          title="All Clients"
          onPageChange={setCurrentPage}
        />
      ) : (
        <div className="rounded-2xl border border-default-200 bg-white p-8 text-sm text-[#6B7280]">
          {activeTab === "ai-credits"
            ? "AI Credits content is not configured yet."
            : "Media Storage content is not configured yet."}
        </div>
      )}

      <ManageCreditAllocationModal
        isOpen={isManageAllocationOpen}
        rows={filteredRows.map((row) => ({
          address: row.address,
          allocated: 800,
          clientName: row.clientName,
          id: row.id,
          used: 500,
        }))}
        onOpenChange={setIsManageAllocationOpen}
      />
    </div>
  );
};
