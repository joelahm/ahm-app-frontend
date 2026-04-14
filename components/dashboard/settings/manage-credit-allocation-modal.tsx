"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Progress } from "@heroui/progress";
import { Trash2, X } from "lucide-react";

interface ManageCreditAllocationRow {
  address: string;
  allocated: number;
  clientName: string;
  id: string;
  used: number;
}

interface ManageCreditAllocationModalProps {
  isOpen: boolean;
  rows: ManageCreditAllocationRow[];
  onOpenChange: (open: boolean) => void;
}

const headerCellClass =
  "bg-[#F9FAFB] px-5 py-4 text-sm font-medium text-[#111827]";

export const ManageCreditAllocationModal = ({
  isOpen,
  rows,
  onOpenChange,
}: ManageCreditAllocationModalProps) => {
  const [allocationRows, setAllocationRows] =
    useState<ManageCreditAllocationRow[]>(rows);

  const closeModal = () => {
    setAllocationRows(rows);
    onOpenChange(false);
  };

  const handleAllocatedChange = (
    id: string,
    direction: "decrement" | "increment",
  ) => {
    setAllocationRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const nextAllocated =
          direction === "increment"
            ? row.allocated + 100
            : Math.max(0, row.allocated - 100);

        return {
          ...row,
          allocated: nextAllocated,
        };
      }),
    );
  };

  const handleDelete = (id: string) => {
    setAllocationRows((currentRows) =>
      currentRows.filter((row) => row.id !== id),
    );
  };

  const totals = useMemo(() => {
    const allocated = allocationRows.reduce(
      (sum, row) => sum + row.allocated,
      0,
    );
    const used = allocationRows.reduce((sum, row) => sum + row.used, 0);
    const remaining = Math.max(0, allocated - used);

    return {
      allocated,
      remaining,
      total: 8000,
    };
  }, [allocationRows]);

  return (
    <Modal
      hideCloseButton
      classNames={{
        base: "max-h-[90vh] max-w-[1240px]",
        body: "overflow-hidden",
      }}
      isDismissable={false}
      isOpen={isOpen}
      size="5xl"
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between border-b border-default-200">
          <h2 className="text-lg font-semibold text-[#111827]">
            Manage Allocation
          </h2>
          <Button
            isIconOnly
            radius="full"
            size="sm"
            variant="light"
            onPress={closeModal}
          >
            <X size={22} />
          </Button>
        </ModalHeader>

        <ModalBody className="space-y-6 overflow-hidden py-5">
          <div>
            <h3 className="text-lg font-medium text-[#1F2937] mb-3">AI Credits</h3>

            <div className="overflow-hidden rounded-[14px] border border-default-200">
              <div className="grid grid-cols-[2.2fr_1.5fr_1fr_1fr_100px]">
                <div className={headerCellClass}>Client</div>
                <div className={headerCellClass}>Allocated</div>
                <div className={headerCellClass}>Used</div>
                <div className={headerCellClass}>Remaining</div>
                <div className={`${headerCellClass} text-right`}>Action</div>
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {allocationRows.map((row) => {
                  const remaining = Math.max(0, row.allocated - row.used);

                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[2.2fr_1.5fr_1fr_1fr_100px] border-t border-default-200"
                    >
                      <div className="space-y-1 px-5 py-3.5">
                        <p className="text-sm font-medium text-[#1F2937]">
                          {row.clientName}
                        </p>
                        <p className="text-sm text-[#9CA3AF]">{row.address}</p>
                      </div>

                      <div className="px-5 py-3.5">
                        <div className="inline-flex h-11 items-center rounded-xl border border-default-200 bg-white px-2 shadow-sm">
                          <Button
                            isIconOnly
                            className="min-w-8 text-[#697586]"
                            radius="full"
                            size="sm"
                            variant="light"
                            onPress={() =>
                              handleAllocatedChange(row.id, "decrement")
                            }
                          >
                            <span className="text-2xl leading-none">-</span>
                          </Button>
                          <span className="text-center text-sm font-semibold text-[#1F2937]">
                            {row.allocated}
                          </span>
                          <Button
                            isIconOnly
                            className="min-w-8 text-primary"
                            radius="full"
                            size="sm"
                            variant="light"
                            onPress={() =>
                              handleAllocatedChange(row.id, "increment")
                            }
                          >
                            <span className="text-xl leading-none">+</span>
                          </Button>
                        </div>
                      </div>

                      <div className="px-5 py-3.5 text-sm text-[#1F2937]">
                        {row.used}
                      </div>

                      <div className="px-5 py-3.5 text-sm text-[#1F2937]">
                        {remaining}
                      </div>

                      <div className="flex justify-end px-5 py-3.5">
                        <Button
                          isIconOnly
                          className="border border-default-200 text-danger"
                          radius="lg"
                          variant="light"
                          onPress={() => handleDelete(row.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex flex-wrap items-center gap-4 text-[18px] text-[#111827]">
                <span className="mr-auto font-semibold text-sm">Total</span>
                <span className="text-[#98A2B3] text-sm">
                  Allocated{" "}
                  <span className="font-semibold text-[#1F2937]">
                    {totals.allocated.toLocaleString()}
                  </span>
                </span>
                <span className="text-[#98A2B3] text-sm">
                  Remaining{" "}
                  <span className="font-semibold text-[#1F2937]">
                    {totals.remaining.toLocaleString()}
                  </span>
                </span>
                <span className="text-[#98A2B3] text-sm">
                  Allocs:{" "}
                  <span className="font-semibold text-[#1F2937]">
                    {totals.allocated.toLocaleString()}
                  </span>{" "}
                  / Total:{" "}
                  <span className="font-semibold text-[#1F2937]">
                    {totals.total.toLocaleString()}
                  </span>
                </span>
              </div>

              <Progress
                aria-label="Allocated credits progress"
                classNames={{
                  indicator: "bg-[#0B2A84]",
                  track: "h-3 rounded-full bg-[#EEF2F7]",
                }}
                radius="full"
                size="md"
                value={(totals.allocated / totals.total) * 100}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="justify-end gap-4 border-t border-default-200">
          <Button
            variant="bordered"
            onPress={closeModal}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary text-white"
            onPress={closeModal}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
