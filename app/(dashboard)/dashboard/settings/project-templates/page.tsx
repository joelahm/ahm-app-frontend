import { SettingsAside } from "@/components/dashboard/settings/settings-aside";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsProjectTemplatesContent } from "@/components/dashboard/settings/settings-project-templates-content";

const SettingsProjectTemplatesPage = () => {
  return (
    <section className="relative pl-64">
      <SettingsAdminOnlyGuard />
      <SettingsAside activeKey="project-templates" />
      <div className="pl-6">
        <SettingsProjectTemplatesContent />
      </div>
    </section>
  );
};

export default SettingsProjectTemplatesPage;
