"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { type InstallerListItem } from "@/components/projects/catalog-types";
import { type ProjectDoorsLayoutResponse } from "@/components/projects/layout-types";
import { type ProjectOpenIssue } from "@/components/projects/project-types";
import { issueLabel } from "@/components/projects/shared";
import { useMediaQuery } from "@/hooks/use-media-query";

import type { MatrixApartmentGroup, MatrixCell, MatrixFloorGroup, MatrixHouseGroup, MatrixRow } from "@/components/projects/door-workspace/types";
import { LEDGER_ROW_PAGE } from "@/components/projects/door-workspace/constants";
import { compareNatural } from "@/components/projects/shared";

// Door workspace state: matrix filters, derived rows and options, selection, focused door, ledger paging. Statements moved verbatim from ProjectsPage (monolith split).
export function useDoorWorkspace({
  layout,
  selectedProjectId,
  canManageProjects,
  activeInstallerById,
  issuesByDoorId,
  doorTypeLabel,
}: {
  layout: ProjectDoorsLayoutResponse | null;
  selectedProjectId: string | null;
  canManageProjects: boolean;
  activeInstallerById: Map<string, InstallerListItem>;
  issuesByDoorId: Map<string, ProjectOpenIssue[]>;
  doorTypeLabel: (id: string) => string;
}) {
  const [focusedDoorId, setFocusedDoorId] = useState<string | null>(null);
  const [focusedDoorReasonId, setFocusedDoorReasonId] = useState("");
  const [focusedDoorComment, setFocusedDoorComment] = useState("");
  const [focusedDoorOverrideReason, setFocusedDoorOverrideReason] =
    useState("");
  const [doorStatusAction, setDoorStatusAction] = useState<
    "install" | "not-installed" | "override-not-installed" | null
  >(null);
  const [matrixHouse, setMatrixHouse] = useState("all");
  const [matrixOrderNumber, setMatrixOrderNumber] = useState("all");
  const [matrixFloor, setMatrixFloor] = useState("all");
  const [matrixLocation, setMatrixLocation] = useState("all");
  const [matrixDoorType, setMatrixDoorType] = useState("all");
  const [matrixStatus, setMatrixStatus] = useState("all");
  const [matrixInstaller, setMatrixInstaller] = useState("all");
  const [matrixIssueFilter, setMatrixIssueFilter] = useState<"all" | "issues">(
    "all",
  );
  const [matrixApartmentSearch, setMatrixApartmentSearch] = useState("");
  const [matrixMarkingSearch, setMatrixMarkingSearch] = useState("");
  // Typing stays responsive: the ledger filters on the deferred value.
  const deferredApartmentSearch = useDeferredValue(matrixApartmentSearch);
  const deferredMarkingSearch = useDeferredValue(matrixMarkingSearch);
  // their breakpoint classes so the hydration default never shows through.
  const ledgerDesktop = useMediaQuery("(min-width: 768px)", true);
  const [ledgerRowLimit, setLedgerRowLimit] = useState(LEDGER_ROW_PAGE);
  const [selectedDoorIds, setSelectedDoorIds] = useState<string[]>([]);
  const [bulkAssignInstallerId, setBulkAssignInstallerId] = useState("");
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
  const matrixRows = useMemo(() => {
    if (!layout) {
      return [] as MatrixRow[];
    }
    const rows: MatrixRow[] = [];
    for (const bucket of layout.buckets) {
      for (const door of bucket.doors) {
        rows.push({
          door_id: door.id,
          order_number: door.order_number || bucket.order_number || "-",
          house_number: bucket.house_number || "-",
          floor_label: bucket.floor_label || "Unknown floor",
          apartment_number: door.apartment_number || "-",
          location_code: door.location_code || bucket.location_code || "-",
          door_marking: door.door_marking || bucket.door_marking || "-",
          unit_label: door.unit_label,
          door_type_id: door.door_type_id,
          door_type_label:
            doorTypeLabel(door.door_type_id),
          status: door.status,
          installer_id: door.installer_id,
          issue_count: (issuesByDoorId.get(door.id) || []).length,
          issue_titles: (issuesByDoorId.get(door.id) || []).map(issueLabel),
        });
      }
    }
    rows.sort((a, b) => {
      const order = compareNatural(a.order_number, b.order_number);
      if (order !== 0) return order;
      const h = compareNatural(a.house_number, b.house_number);
      if (h !== 0) return h;
      const f = compareNatural(a.floor_label, b.floor_label);
      if (f !== 0) return f;
      const apt = compareNatural(a.apartment_number, b.apartment_number);
      if (apt !== 0) return apt;
      return compareNatural(a.unit_label, b.unit_label);
    });
    return rows;
  }, [layout, doorTypeLabel, issuesByDoorId]);
  const focusedDoorRow = useMemo(
    () => matrixRows.find((row) => row.door_id === focusedDoorId) || null,
    [focusedDoorId, matrixRows],
  );
  const focusedDoorInstaller = focusedDoorRow?.installer_id
    ? activeInstallerById.get(focusedDoorRow.installer_id) || null
    : null;
  const focusedDoorIssues = focusedDoorRow
    ? issuesByDoorId.get(focusedDoorRow.door_id) || []
    : [];
  const projectDoorTotals = useMemo(() => {
    let installedCount = 0;
    let issueCount = 0;
    let assignedCount = 0;

    for (const row of matrixRows) {
      if (row.status === "INSTALLED") {
        installedCount += 1;
      }
      if (row.installer_id) {
        assignedCount += 1;
      }
      issueCount += row.issue_count;
    }

    const totalDoors = layout?.total_doors ?? matrixRows.length;

    return {
      totalDoors,
      installedCount,
      openCount: Math.max(totalDoors - installedCount, 0),
      issueCount,
      assignedCount,
    };
  }, [layout?.total_doors, matrixRows]);
  const matrixHouseOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.house_number))).sort(
        compareNatural,
      ),
    [matrixRows],
  );
  const matrixOrderNumberOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.order_number))).sort(
        compareNatural,
      ),
    [matrixRows],
  );
  const matrixFloorOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.floor_label))).sort(
        compareNatural,
      ),
    [matrixRows],
  );
  const matrixLocationOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.location_code))).sort(
        compareNatural,
      ),
    [matrixRows],
  );
  const matrixDoorTypeOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.door_type_id)))
        .map((id) => ({
          id,
          label: doorTypeLabel(id),
        }))
        .sort((a, b) => compareNatural(a.label, b.label)),
    [matrixRows, doorTypeLabel],
  );
  const matrixStatusOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.status))).sort(compareNatural),
    [matrixRows],
  );
  const filteredMatrixRows = useMemo(() => {
    const aptQ = deferredApartmentSearch.trim().toLowerCase();
    const markingQ = deferredMarkingSearch.trim().toLowerCase();
    return matrixRows.filter((row) => {
      if (matrixOrderNumber !== "all" && row.order_number !== matrixOrderNumber)
        return false;
      if (matrixHouse !== "all" && row.house_number !== matrixHouse)
        return false;
      if (matrixFloor !== "all" && row.floor_label !== matrixFloor)
        return false;
      if (matrixLocation !== "all" && row.location_code !== matrixLocation)
        return false;
      if (matrixDoorType !== "all" && row.door_type_id !== matrixDoorType)
        return false;
      if (matrixStatus !== "all" && row.status !== matrixStatus) return false;
      if (matrixInstaller === "unassigned" && row.installer_id) return false;
      if (
        matrixInstaller !== "all" &&
        matrixInstaller !== "unassigned" &&
        row.installer_id !== matrixInstaller
      )
        return false;
      if (matrixIssueFilter === "issues" && row.issue_count === 0)
        return false;
      if (aptQ && !row.apartment_number.toLowerCase().includes(aptQ))
        return false;
      if (
        markingQ &&
        ![row.door_marking, row.unit_label, row.apartment_number].some((value) =>
          value.toLowerCase().includes(markingQ),
        )
      )
        return false;
      return true;
    });
  }, [
    matrixRows,
    matrixOrderNumber,
    matrixHouse,
    matrixFloor,
    matrixLocation,
    matrixDoorType,
    matrixStatus,
    matrixInstaller,
    matrixIssueFilter,
    deferredApartmentSearch,
    deferredMarkingSearch,
  ]);
  const visibleMatrixRows = useMemo(
    () => filteredMatrixRows.slice(0, ledgerRowLimit),
    [filteredMatrixRows, ledgerRowLimit],
  );
  const hiddenMatrixRows = filteredMatrixRows.length - visibleMatrixRows.length;
  useEffect(() => {
    // A new filter result starts from the first page again.
    setLedgerRowLimit(LEDGER_ROW_PAGE);
  }, [filteredMatrixRows]);
  const matrixDoorIds = useMemo(
    () => matrixRows.map((row) => row.door_id),
    [matrixRows],
  );
  const filteredDoorIds = useMemo(
    () => filteredMatrixRows.map((row) => row.door_id),
    [filteredMatrixRows],
  );
  const selectedDoorIdSet = useMemo(
    () => new Set(selectedDoorIds),
    [selectedDoorIds],
  );
  const selectedFilteredDoorCount = useMemo(
    () => filteredDoorIds.filter((id) => selectedDoorIdSet.has(id)).length,
    [filteredDoorIds, selectedDoorIdSet],
  );
  const allFilteredDoorsSelected =
    filteredDoorIds.length > 0 &&
    selectedFilteredDoorCount === filteredDoorIds.length;
  const hiddenSelectedDoorCount = selectedDoorIds.length - selectedFilteredDoorCount;
  const resetMatrixFilters = () => {
    setMatrixOrderNumber("all");
    setMatrixHouse("all");
    setMatrixFloor("all");
    setMatrixLocation("all");
    setMatrixDoorType("all");
    setMatrixStatus("all");
    setMatrixInstaller("all");
    setMatrixIssueFilter("all");
    setMatrixApartmentSearch("");
    setMatrixMarkingSearch("");
  };
  const existingDoorMarkings = useMemo(() => {
    const values = new Set<string>();
    for (const row of matrixRows) {
      const marking = row.door_marking.trim();
      if (!marking || marking === "-") {
        continue;
      }
      values.add(marking.toLowerCase());
    }
    return values;
  }, [matrixRows]);
  const filteredMatrixSummary = useMemo(() => {
    const uniqueOrders = new Set<string>();
    const uniqueHouses = new Set<string>();
    const uniqueFloors = new Set<string>();
    const uniqueApartments = new Set<string>();
    const uniqueLocations = new Set<string>();
    const uniqueMarkings = new Set<string>();
    let installedCount = 0;
    let openCount = 0;
    let assignedCount = 0;
    let issuesCount = 0;

    for (const row of filteredMatrixRows) {
      uniqueOrders.add(row.order_number);
      uniqueHouses.add(row.house_number);
      uniqueFloors.add(`${row.house_number}::${row.floor_label}`);
      uniqueApartments.add(
        `${row.house_number}::${row.floor_label}::${row.apartment_number}`,
      );
      uniqueLocations.add(row.location_code);
      if (row.door_marking !== "-") {
        uniqueMarkings.add(row.door_marking);
      }
      if (row.status === "INSTALLED") {
        installedCount += 1;
      } else {
        openCount += 1;
      }
      if (row.installer_id) {
        assignedCount += 1;
      }
      issuesCount += row.issue_count;
    }

    return {
      orders: uniqueOrders.size,
      houses: uniqueHouses.size,
      floors: uniqueFloors.size,
      apartments: uniqueApartments.size,
      locations: uniqueLocations.size,
      markings: uniqueMarkings.size,
      installedCount,
      openCount,
      assignedCount,
      issuesCount,
    };
  }, [filteredMatrixRows]);
  const matrixLegendCounts = useMemo(() => {
    const counts = {
      installed: 0,
      inProgress: 0,
      issues: 0,
      notInstalled: 0,
      locked: 0,
      cancelled: 0,
    };

    for (const row of filteredMatrixRows) {
      const normalized = row.status.trim().toUpperCase();
      if (row.issue_count > 0) {
        counts.issues += 1;
      }
      if (["INSTALLED", "DONE", "COMPLETED"].includes(normalized)) {
        counts.installed += 1;
      } else if (["IN_PROGRESS", "ASSIGNED", "ACTIVE"].includes(normalized)) {
        counts.inProgress += 1;
      } else if (["BLOCKED", "LOCKED"].includes(normalized)) {
        counts.locked += 1;
      } else if (["CANCELLED", "CANCELED"].includes(normalized)) {
        counts.cancelled += 1;
      } else {
        counts.notInstalled += 1;
      }
    }

    return counts;
  }, [filteredMatrixRows]);
  const projectDetailMatrix = useMemo(() => {
    const houseMap = new Map<
      string,
      {
        house_number: string;
        total_doors: number;
        apartments: Set<string>;
        issue_count: number;
        installed_count: number;
        open_count: number;
        floors: Map<
          string,
          {
            floor_label: string;
            total_doors: number;
            issue_count: number;
            installed_count: number;
            open_count: number;
            location_codes: Set<string>;
            apartments: Map<
              string,
              {
                apartment_number: string;
                order_numbers: Set<string>;
                total_doors: number;
                issue_count: number;
                installed_count: number;
                open_count: number;
                cells: Map<
                  string,
                  {
                    location_code: string;
                    doors: MatrixRow[];
                    issue_count: number;
                    statuses: Record<string, number>;
                  }
                >;
              }
            >;
          }
        >;
      }
    >();

    for (const row of filteredMatrixRows) {
      let house = houseMap.get(row.house_number);
      if (!house) {
        house = {
          house_number: row.house_number,
          total_doors: 0,
          apartments: new Set(),
          issue_count: 0,
          installed_count: 0,
          open_count: 0,
          floors: new Map(),
        };
        houseMap.set(row.house_number, house);
      }

      house.total_doors += 1;
      house.apartments.add(`${row.floor_label}::${row.apartment_number}`);
      house.issue_count += row.issue_count;
      if (row.status === "INSTALLED") {
        house.installed_count += 1;
      } else {
        house.open_count += 1;
      }

      let floor = house.floors.get(row.floor_label);
      if (!floor) {
        floor = {
          floor_label: row.floor_label,
          total_doors: 0,
          issue_count: 0,
          installed_count: 0,
          open_count: 0,
          location_codes: new Set(),
          apartments: new Map(),
        };
        house.floors.set(row.floor_label, floor);
      }

      floor.total_doors += 1;
      floor.issue_count += row.issue_count;
      floor.location_codes.add(row.location_code);
      if (row.status === "INSTALLED") {
        floor.installed_count += 1;
      } else {
        floor.open_count += 1;
      }

      let apartment = floor.apartments.get(row.apartment_number);
      if (!apartment) {
        apartment = {
          apartment_number: row.apartment_number,
          order_numbers: new Set(),
          total_doors: 0,
          issue_count: 0,
          installed_count: 0,
          open_count: 0,
          cells: new Map(),
        };
        floor.apartments.set(row.apartment_number, apartment);
      }

      apartment.order_numbers.add(row.order_number);
      apartment.total_doors += 1;
      apartment.issue_count += row.issue_count;
      if (row.status === "INSTALLED") {
        apartment.installed_count += 1;
      } else {
        apartment.open_count += 1;
      }

      let cell = apartment.cells.get(row.location_code);
      if (!cell) {
        cell = {
          location_code: row.location_code,
          doors: [],
          issue_count: 0,
          statuses: {},
        };
        apartment.cells.set(row.location_code, cell);
      }
      cell.doors.push(row);
      cell.issue_count += row.issue_count;
      cell.statuses[row.status] = (cell.statuses[row.status] || 0) + 1;
    }

    return Array.from(houseMap.values())
      .sort((a, b) => compareNatural(a.house_number, b.house_number))
      .map<MatrixHouseGroup>((house) => ({
        house_number: house.house_number,
        total_doors: house.total_doors,
        apartments_count: house.apartments.size,
        issue_count: house.issue_count,
        installed_count: house.installed_count,
        open_count: house.open_count,
        floors: Array.from(house.floors.values())
          .sort((a, b) => compareNatural(a.floor_label, b.floor_label))
          .map<MatrixFloorGroup>((floor) => ({
            floor_label: floor.floor_label,
            location_codes: Array.from(floor.location_codes).sort(
              compareNatural,
            ),
            total_doors: floor.total_doors,
            issue_count: floor.issue_count,
            installed_count: floor.installed_count,
            open_count: floor.open_count,
            apartments: Array.from(floor.apartments.values())
              .sort((a, b) =>
                compareNatural(a.apartment_number, b.apartment_number),
              )
              .map<MatrixApartmentGroup>((apartment) => ({
                apartment_number: apartment.apartment_number,
                order_numbers: Array.from(apartment.order_numbers).sort(
                  compareNatural,
                ),
                total_doors: apartment.total_doors,
                issue_count: apartment.issue_count,
                installed_count: apartment.installed_count,
                open_count: apartment.open_count,
                cells: Array.from(apartment.cells.values())
                  .sort((a, b) =>
                    compareNatural(a.location_code, b.location_code),
                  )
                  .map<MatrixCell>((cell) => ({
                    location_code: cell.location_code,
                    door_count: cell.doors.length,
                    issue_count: cell.issue_count,
                    statuses: cell.statuses,
                    doors: [...cell.doors].sort((a, b) =>
                      compareNatural(a.unit_label, b.unit_label),
                    ),
                  })),
              })),
          })),
      }));
  }, [filteredMatrixRows]);
  const projectDetailFloors = useMemo(
    () =>
      projectDetailMatrix.flatMap((house) =>
        house.floors.map((floor) => ({
          ...floor,
          house_number: house.house_number,
        })),
      ),
    [projectDetailMatrix],
  );
  const projectDetailFloorPreview = useMemo(
    () => projectDetailFloors.slice(0, 4),
    [projectDetailFloors],
  );
  const projectDetailFloorPreviewOverflow = Math.max(
    projectDetailFloors.length - projectDetailFloorPreview.length,
    0,
  );
  useEffect(() => {
    setSelectedDoorIds([]);
    setFocusedDoorId(null);
    setFocusedDoorReasonId("");
    setFocusedDoorComment("");
    setFocusedDoorOverrideReason("");
    setBulkAssignInstallerId("");
    setMatrixIssueFilter("all");
    setMatrixInstaller("all");
  }, [selectedProjectId]);
  useEffect(() => {
    const available = new Set(matrixDoorIds);
    setSelectedDoorIds((prev) => prev.filter((id) => available.has(id)));
    setFocusedDoorId((prev) => (prev && available.has(prev) ? prev : null));
  }, [matrixDoorIds]);
  useEffect(() => {
    setFocusedDoorReasonId("");
    setFocusedDoorComment("");
    setFocusedDoorOverrideReason("");
  }, [focusedDoorId]);
  const toggleDoorSelection = (doorId: string) => {
    if (!canManageProjects) return;
    setSelectedDoorIds((prev) =>
      prev.includes(doorId)
        ? prev.filter((id) => id !== doorId)
        : [...prev, doorId],
    );
  };
  const toggleFilteredDoorSelection = () => {
    if (!canManageProjects) return;
    if (filteredDoorIds.length === 0) {
      return;
    }
    const visible = new Set(filteredDoorIds);
    if (allFilteredDoorsSelected) {
      setSelectedDoorIds((prev) => prev.filter((id) => !visible.has(id)));
      return;
    }
    setSelectedDoorIds((prev) =>
      Array.from(new Set([...prev, ...filteredDoorIds])),
    );
  };

  return {
    allFilteredDoorsSelected,
    bulkAssignInstallerId,
    bulkAssignLoading,
    doorStatusAction,
    existingDoorMarkings,
    filteredDoorIds,
    filteredMatrixRows,
    filteredMatrixSummary,
    focusedDoorComment,
    focusedDoorId,
    focusedDoorInstaller,
    focusedDoorIssues,
    focusedDoorOverrideReason,
    focusedDoorReasonId,
    focusedDoorRow,
    hiddenMatrixRows,
    hiddenSelectedDoorCount,
    ledgerDesktop,
    matrixApartmentSearch,
    matrixDoorType,
    matrixDoorTypeOptions,
    matrixFloor,
    matrixFloorOptions,
    matrixHouse,
    matrixHouseOptions,
    matrixInstaller,
    matrixIssueFilter,
    matrixLegendCounts,
    matrixLocation,
    matrixLocationOptions,
    matrixMarkingSearch,
    matrixOrderNumber,
    matrixOrderNumberOptions,
    matrixRows,
    matrixStatus,
    matrixStatusOptions,
    projectDetailFloorPreview,
    projectDetailFloorPreviewOverflow,
    projectDetailMatrix,
    projectDoorTotals,
    resetMatrixFilters,
    selectedDoorIdSet,
    selectedDoorIds,
    setBulkAssignInstallerId,
    setBulkAssignLoading,
    setDoorStatusAction,
    setFocusedDoorComment,
    setFocusedDoorId,
    setFocusedDoorOverrideReason,
    setFocusedDoorReasonId,
    setLedgerRowLimit,
    setMatrixApartmentSearch,
    setMatrixDoorType,
    setMatrixFloor,
    setMatrixHouse,
    setMatrixInstaller,
    setMatrixIssueFilter,
    setMatrixLocation,
    setMatrixMarkingSearch,
    setMatrixOrderNumber,
    setMatrixStatus,
    setSelectedDoorIds,
    toggleDoorSelection,
    toggleFilteredDoorSelection,
    visibleMatrixRows,
  };
}
