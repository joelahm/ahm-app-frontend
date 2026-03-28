"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@heroui/avatar";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/dropdown";
import {
  CheckCheck,
  CheckCircle2,
  EllipsisVertical,
  Eye,
  Globe,
  ImageUp,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Star,
  TimerReset,
  Trash2,
} from "lucide-react";

import { clientsApi } from "@/apis/clients";
import { useAuth } from "@/components/auth/auth-context";
import { FacebookIcon, TwitterXIcon, InstagramIcon } from "@/components/icons";
import {
  GooglePlacesAutocomplete,
  type GooglePlacesAutocompleteItem,
} from "@/components/form/google-places-autocomplete";

type GalleryItem = {
  id: string;
  imageUrl?: string | null;
  title: string;
};

interface ClientGbpProfileProps {
  clientId?: number | string;
  businessName?: string;
  category?: string;
  completionScore?: string;
  gallery?: GalleryItem[];
  rating?: string;
  reviewCount?: string;
}

const businessCategories: string[] = [];

const serviceAreas: string[] = [];

const openingHours: Array<{ day: string; open: boolean }> = [];

const specialHours: Array<{ date: string; key: string; title: string }> = [];

const attributeGroups: Array<{ items: string[]; title: string }> = [];

const sectionCardClass =
  "rounded-[18px] border border-default-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]";
const sectionTitleClass =
  "mb-3 flex items-center gap-1.5 text-sm font-semibold text-[#111827]";
const contactLabelClass =
  "text-[11px] font-medium uppercase tracking-wide text-default-400";
const contactValueClass = "text-sm font-medium text-[#111827]";
const emptyValueClass = "text-sm text-default-400";

const DetailHeader = ({ title }: { title: string }) => (
  <div className={sectionTitleClass}>
    <span>{title}</span>
    <Pencil className="text-default-400" size={13} />
  </div>
);

const StatusBadge = ({ active }: { active: boolean }) => (
  <span
    className={`rounded-full px-2 py-0.5 text-[11px] text-center font-semibold ${
      active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#EF4444]"
    }`}
  >
    {active ? "Open" : "Closed"}
  </span>
);

export const ClientGbpProfile = ({
  clientId,
  businessName = "",
  category = "",
  completionScore = "",
  gallery = [],
  rating = "",
  reviewCount = "",
}: ClientGbpProfileProps) => {
  const { isLoading, session } = useAuth();
  const [gbpDetails, setGbpDetails] = useState<Awaited<
    ReturnType<typeof clientsApi.getClientGbpDetails>
  > | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);
  const [selectedPlace, setSelectedPlace] =
    useState<GooglePlacesAutocompleteItem | null>(null);
  const effectiveBusinessName = gbpDetails?.businessName ?? businessName;
  const effectiveCategory = gbpDetails?.category ?? category;
  const effectiveCompletionScore =
    gbpDetails?.completionScore ?? completionScore;
  const effectiveGallery = gbpDetails?.gallery ?? gallery;
  const effectiveRating = gbpDetails?.rating ?? rating;
  const effectiveReviewCount = gbpDetails?.reviewCount ?? reviewCount;
  const effectivePhone = gbpDetails?.phone ?? null;
  const effectiveEmail = gbpDetails?.email ?? null;
  const effectiveWebsite = gbpDetails?.website ?? null;
  const effectiveOpeningDate = gbpDetails?.openingDate ?? null;
  const effectiveBusinessLocation = gbpDetails?.businessLocation ?? null;
  const effectiveServiceAreas = gbpDetails?.serviceAreas ?? serviceAreas;
  const effectiveBusinessDescription = gbpDetails?.businessDescription ?? null;
  const effectivePrimaryCategory =
    gbpDetails?.primaryCategory ?? effectiveCategory ?? null;
  const effectiveSecondaryCategories =
    gbpDetails?.secondaryCategories ?? businessCategories;
  const effectiveOpeningHours = gbpDetails?.openingHours ?? openingHours;
  const effectiveSpecialHours = gbpDetails?.specialHours ?? specialHours;
  const effectiveAttributeGroups =
    gbpDetails?.attributeGroups ?? attributeGroups;
  const effectiveSocialProfiles = gbpDetails?.socialProfiles ?? {
    facebook: null,
    instagram: null,
    twitterX: null,
  };
  const mapEmbedSrc = useMemo(() => {
    if (
      gbpDetails?.latitude !== null &&
      gbpDetails?.latitude !== undefined &&
      gbpDetails?.longitude !== null &&
      gbpDetails?.longitude !== undefined
    ) {
      return `https://www.google.com/maps?q=${gbpDetails.latitude},${gbpDetails.longitude}&z=15&output=embed`;
    }

    if (effectiveBusinessLocation) {
      return `https://www.google.com/maps?q=${encodeURIComponent(effectiveBusinessLocation)}&z=15&output=embed`;
    }

    return null;
  }, [effectiveBusinessLocation, gbpDetails?.latitude, gbpDetails?.longitude]);
  const hasFetchedGbpData = Boolean(
    gbpDetails &&
      (gbpDetails.businessName ||
        gbpDetails.category ||
        gbpDetails.completionScore ||
        gbpDetails.rating ||
        gbpDetails.reviewCount ||
        gbpDetails.gallery.length > 0 ||
        gbpDetails.phone ||
        gbpDetails.email ||
        gbpDetails.website ||
        gbpDetails.bookingsLink ||
        gbpDetails.openingDate ||
        gbpDetails.businessLocation ||
        gbpDetails.serviceAreas.length > 0 ||
        gbpDetails.businessDescription ||
        gbpDetails.primaryCategory ||
        gbpDetails.secondaryCategories.length > 0 ||
        gbpDetails.openingHours.length > 0 ||
        gbpDetails.specialHours.length > 0 ||
        gbpDetails.attributeGroups.length > 0 ||
        gbpDetails.socialProfiles.facebook ||
        gbpDetails.socialProfiles.instagram ||
        gbpDetails.socialProfiles.twitterX),
  );

  useEffect(() => {
    if (!clientId || !session?.accessToken) {
      return;
    }

    let isMounted = true;

    const loadGbpDetails = async () => {
      setIsFetchingDetails(true);

      try {
        const response = await clientsApi.getClientGbpDetails(
          session.accessToken,
          clientId,
        );

        if (!isMounted) {
          return;
        }

        setGbpDetails(response);
      } catch {
        if (!isMounted) {
          return;
        }

        setGbpDetails(null);
      } finally {
        if (isMounted) {
          setIsFetchingDetails(false);
        }
      }
    };

    void loadGbpDetails();

    return () => {
      isMounted = false;
    };
  }, [clientId, session?.accessToken]);

  const handleAddLocation = async () => {
    if (!selectedPlace?.placeId || !clientId || !session?.accessToken) {
      return;
    }

    const normalizedClientId = Number(clientId);

    if (!Number.isFinite(normalizedClientId)) {
      throw new Error("Invalid client id for GBP sync.");
    }

    setIsSubmittingLocation(true);

    try {
      await clientsApi.syncGbpDetails(session.accessToken, {
        clientId: normalizedClientId,
        gl: "uk",
        hl: "en",
        placeId: selectedPlace.placeId,
      });
      const response = await clientsApi.getClientGbpDetails(
        session.accessToken,
        normalizedClientId,
      );

      setGbpDetails(response);
      setSelectedPlace(null);
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  if (isLoading || isFetchingDetails) {
    return (
      <Card className="border border-default-200 bg-white shadow-none">
        <CardBody className="p-6 text-sm text-default-500">
          Loading GBP details...
        </CardBody>
      </Card>
    );
  }

  if (!hasFetchedGbpData) {
    return (
      <Card className="mx-auto max-w-lg border border-default-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <CardHeader className="block px-8 pb-0 pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold mb-2 tracking-[-0.03em] text-[#111827]">
                Sync Profile
              </h1>
              <p className="text-sm text-[#6B7280]">
                Add a Google Business Profile to this client.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-8 pb-8 pt-8">
          <Card className="border border-default-200 bg-[#FBFCFF] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <CardBody className="p-0">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-medium bg-[#EEF2FF] text-[#4F46E5]">
                  <MapPin size={28} />
                </div>
                <h2 className="font-semibold tracking-[-0.03em] text-[#111827]">
                  Search Google Business Profile
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-[#6B7280]">
                  Find the client&apos;s business listing by name and address
                  using Google search
                </p>

                <div className="mt-4">
                  <GooglePlacesAutocomplete
                    className="w-full"
                    placeholder="Search for Google Profile"
                    size="lg"
                    onSelect={setSelectedPlace}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button
              className="flex-1 bg-[#4F46E5] text-white"
              isDisabled={!selectedPlace || isSubmittingLocation}
              isLoading={isSubmittingLocation}
              size="lg"
              onPress={() => {
                void handleAddLocation();
              }}
            >
              Add New Location
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const galleryWithImages = effectiveGallery.filter((photo) =>
    Boolean(photo.imageUrl),
  );
  const profilePhoto = galleryWithImages[0] ?? null;
  const coverPhoto = galleryWithImages[1] ?? galleryWithImages[0] ?? null;
  const galleryPhotos = galleryWithImages.slice(2);
  const avatarImageUrl = profilePhoto?.imageUrl ?? null;
  const detailGroups = effectiveAttributeGroups.filter(
    (group) => group.items.length > 0,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <Avatar
            showFallback
            className="h-20 w-20 shrink-0 bg-[#0E98B5] text-white"
            classNames={{ name: "text-xl font-semibold" }}
            name={effectiveBusinessName ?? ""}
            src={avatarImageUrl ?? undefined}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-[#111827]">
                {effectiveBusinessName || "No GBP business name"}
              </h1>
              <CheckCircle2 className="text-[#16A34A]" size={16} />
            </div>
            <p className="mt-1 text-sm text-default-500">
              {effectivePrimaryCategory || "No primary category"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#475569]">
              {effectiveRating ? (
                <span className="flex items-center gap-1">
                  <Star
                    className="fill-[#F59E0B] text-[#F59E0B]"
                    size={13}
                  />
                  {effectiveRating} {effectiveReviewCount ?? ""}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button>Connect to Google</Button>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                className="border border-default-200 bg-white text-[#111827]"
                radius="full"
                variant="light"
              >
                <EllipsisVertical size={18} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="GBP actions">
              <DropdownItem
                key="sync-profile"
                startContent={<RefreshCw size={16} />}
              >
                Sync Profile
              </DropdownItem>
              <DropdownItem
                key="view-members"
                startContent={<Eye size={16} />}
              >
                View Members
              </DropdownItem>
              <DropdownItem
                key="settings"
                startContent={<CheckCircle2 size={16} />}
              >
                Settings
              </DropdownItem>
              <DropdownItem
                key="remove-location"
                className="text-danger"
                color="danger"
                startContent={<Trash2 size={16} />}
              >
                Remove location
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <section className={sectionCardClass}>
            <DetailHeader title="Contact Info" />
            <div className="space-y-4">
              {[
                {
                  icon: Phone,
                  label: "Contact Tel",
                  value: effectivePhone ?? "",
                },
                {
                  icon: Globe,
                  label: "Website",
                  value: effectiveWebsite ?? "",
                },
                {
                  icon: Mail,
                  label: "Email",
                  value: effectiveEmail ?? "",
                },
                {
                  icon: TimerReset,
                  label: "Live Since",
                  value: effectiveOpeningDate ?? "",
                },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className={contactLabelClass}>{item.label}</p>
                  <div className="flex items-start gap-2">
                    <item.icon className="mt-0.5 text-[#0E98B5]" size={14} />
                    <p
                      className={
                        item.value ? contactValueClass : emptyValueClass
                      }
                    >
                      {item.value || "No data"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-default-400">
                Social Profiles
              </p>
              {effectiveSocialProfiles.facebook ||
              effectiveSocialProfiles.twitterX ||
              effectiveSocialProfiles.instagram ? (
                <div className="flex gap-2">
                  {[
                    {
                      Icon: FacebookIcon,
                      key: "facebook",
                      url: effectiveSocialProfiles.facebook,
                    },
                    {
                      Icon: InstagramIcon,
                      key: "instagram",
                      url: effectiveSocialProfiles.instagram,
                    },
                    {
                      Icon: TwitterXIcon,
                      key: "twitter-x",
                      url: effectiveSocialProfiles.twitterX,
                    },
                  ]
                    .filter((item) => Boolean(item.url))
                    .map(({ Icon, key }) => (
                      <Button
                        key={key}
                        isIconOnly
                        className="border border-default-200 bg-white text-[#111827]"
                        radius="full"
                        size="sm"
                        variant="light"
                      >
                        <Icon size={15} />
                      </Button>
                    ))}
                </div>
              ) : (
                <p className={emptyValueClass}>No social profiles</p>
              )}
            </div>
          </section>
          <section className={sectionCardClass}>
            <div className="grid gap-4">
              <div className="space-y-3">
                <DetailHeader
                  title={`About ${effectiveBusinessName || "Business"}`}
                />
                <p className="text-sm leading-6 text-[#475569]">
                  {effectiveBusinessDescription || "No business description"}
                </p>
              </div>
              <hr className="border-default-200" />
              <div className="space-y-3">
                <DetailHeader title="Business Category" />
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-default-400">
                      Primary Category
                    </p>
                    <p className="mt-1 font-medium text-[#111827]">
                      {effectivePrimaryCategory || "No primary category"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-default-400">
                      Secondary Categories
                    </p>
                    {effectiveSecondaryCategories.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {effectiveSecondaryCategories.map((item) => (
                          <Chip
                            key={item}
                            className="bg-[#F8FAFC] text-[#334155]"
                            radius="full"
                            size="sm"
                            variant="flat"
                          >
                            {item}
                          </Chip>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-default-400">
                        No secondary categories
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
          <section className={sectionCardClass}>
            <DetailHeader
              title={`Business Opening Hours ${effectiveSpecialHours.length ? effectiveSpecialHours.length : ""}`.trim()}
            />
            <div className="space-y-2">
              {effectiveOpeningHours.length > 0 ? (
                effectiveOpeningHours.map((row) => (
                  <div
                    key={row.day}
                    className="grid grid-cols-[84px_56px_1fr] items-center gap-2 rounded-xl bg-[#FAFBFC] px-3 py-2"
                  >
                    <span className="text-sm font-medium text-[#111827]">
                      {row.day}
                    </span>
                    <StatusBadge active={row.open} />
                    <div className="grid grid-cols-[38px_4px_44px_14px_38px_4px_44px] items-center gap-1 text-center text-[11px] text-default-500">
                      <div className="rounded-md border border-default-200 bg-white py-1">
                        {row.openTime?.split(":")[0] ?? "--"}
                      </div>
                      <span>:</span>
                      <div className="rounded-md border border-default-200 bg-white py-1">
                        {row.openTime?.split(":")[1] ?? "--"}
                      </div>
                      <span>-</span>
                      <div className="rounded-md border border-default-200 bg-white py-1">
                        {row.closeTime?.split(":")[0] ?? "--"}
                      </div>
                      <span>:</span>
                      <div className="rounded-md border border-default-200 bg-white py-1">
                        {row.closeTime?.split(":")[1] ?? "--"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className={emptyValueClass}>No business opening hours</p>
              )}

              {effectiveSpecialHours.length > 0 ? (
                <div className="border-t border-default-200 pt-3">
                  <p className="mb-2 text-xs font-semibold text-[#111827]">
                    Special Hours
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {effectiveSpecialHours.map((item) => (
                      <Chip
                        key={item.key}
                        className="bg-[#F8FAFC] text-[#334155]"
                        radius="full"
                        size="sm"
                        variant="flat"
                      >
                        {item.title} {item.date}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
          <section className={sectionCardClass}>
            <DetailHeader title="Location and Areas" />
            <div className="grid gap-4">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-default-400">
                    Address
                  </p>
                  <p className="mt-1 text-sm text-[#111827]">
                    {effectiveBusinessLocation || "No business location"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-default-400">
                    Service Areas
                  </p>
                  {effectiveServiceAreas.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {effectiveServiceAreas.map((area) => (
                        <Chip
                          key={area}
                          className="bg-[#F8FAFC] text-[#334155]"
                          radius="full"
                          size="sm"
                          variant="flat"
                        >
                          {area}
                        </Chip>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-default-400">
                      No service areas
                    </p>
                  )}
                </div>
              </div>
              <div className="relative h-56 overflow-hidden rounded-2xl border border-default-200 bg-[#F8FAFC]">
                {mapEmbedSrc ? (
                  <iframe
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapEmbedSrc}
                    title="Business location map"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow">
                      <MapPin className="text-default-400" size={14} />
                      <span className="text-xs font-semibold text-default-400">
                        No pinned location
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
      </div>

      <div className="gap-4">
          <section className={sectionCardClass}>
            <DetailHeader title="More Details" />
            {detailGroups.length > 0 ? (
              <div className="space-y-4">
                {detailGroups.map((group) => (
                  <div
                    key={group.title}
                    className="grid gap-3 border-b border-default-200 pb-4 last:border-b-0 last:pb-0 md:grid-cols-[180px_minmax(0,1fr)]"
                  >
                    <p className="text-sm font-medium text-[#111827]">
                      {group.title}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={`${group.title}-${item}`}
                          className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm text-[#475569]"
                        >
                          <span>{item}</span>
                          <CheckCheck className="text-[#16A34A]" size={14} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={emptyValueClass}>No attributes</p>
            )}
          </section>
      </div>

      <div className="gap-4">

        <div className="space-y-4">
          <section className={sectionCardClass}>
            <DetailHeader title="Gallery Photos" />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#111827]">
                    Profile Photo
                  </p>
                  <Button
                    className="border border-default-200 bg-white text-[#111827]"
                    radius="sm"
                    size="sm"
                    startContent={<Pencil size={14} />}
                    variant="light"
                  >
                    Edit
                  </Button>
                </div>
                <div className="overflow-hidden rounded-[22px] border border-default-200 bg-white p-4">
                  {profilePhoto?.imageUrl ? (
                    <img
                      alt={profilePhoto.title}
                      className="h-44 w-full rounded-[18px] object-cover"
                      referrerPolicy="no-referrer"
                      src={avatarImageUrl}
                    />
                  ) : (
                    <div className="grid h-44 place-items-center rounded-[18px] bg-[#F8FAFC]">
                      <Avatar
                        showFallback
                        className="h-28 w-28 bg-[#0E98B5] text-white"
                        name={effectiveBusinessName ?? ""}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#111827]">
                    Cover Photo
                  </p>
                  <Button
                    className="border border-default-200 bg-white text-[#111827]"
                    radius="sm"
                    size="sm"
                    startContent={<Pencil size={14} />}
                    variant="light"
                  >
                    Edit
                  </Button>
                </div>
                <div className="overflow-hidden rounded-[22px] border border-default-200 bg-white p-4">
                  {coverPhoto?.imageUrl ? (
                    <img
                      alt={coverPhoto.title}
                      className="h-44 w-full rounded-[18px] object-cover"
                      referrerPolicy="no-referrer"
                      src={coverPhoto.imageUrl}
                    />
                  ) : (
                    <div className="h-44 w-full rounded-[18px] bg-[#F8FAFC]" />
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className={sectionCardClass}>
            <DetailHeader title="Gallery Photos" />
            <div className="space-y-3">
              <div className="rounded-[22px] border border-dashed border-default-200 bg-white px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F8FAFC] text-[#6B7280] shadow-sm">
                  <ImageUp size={20} />
                </div>
                <p className="mt-4 text-sm font-semibold text-[#022279]">
                  Click to upload{" "}
                  <span className="font-normal text-default-500">
                    or drag and drop
                  </span>
                </p>
                <p className="mt-1 text-xs text-default-400">
                  SVG, PNG, JPG or GIF (max. 800×400px)
                </p>
              </div>

              {galleryPhotos.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {galleryPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-[18px] border border-default-200 bg-white"
                    >
                      {photo.imageUrl ? (
                        <img
                          alt={photo.title}
                          className="h-40 w-full object-cover"
                          referrerPolicy="no-referrer"
                          src={photo.imageUrl}
                        />
                      ) : (
                        <div className="h-40 w-full bg-[#F8FAFC]" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={emptyValueClass}>No extra gallery photos</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
