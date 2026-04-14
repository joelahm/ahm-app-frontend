import { SettingsAside } from "@/components/dashboard/settings/settings-aside";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsCreditUsageContent } from "@/components/dashboard/settings/settings-credit-usage-content";

const SettingsCreditUsagePage = () => {
  return (
    <section className="relative pl-64">
      <SettingsAdminOnlyGuard />
      <SettingsAside activeKey="credit-usage" />
      <div className="pl-6">
        <SettingsCreditUsageContent />
      </div>
    </section>
  );
};

export default SettingsCreditUsagePage;
