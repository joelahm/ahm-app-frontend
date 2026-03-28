import { SettingsAside } from "@/components/dashboard/settings/settings-aside";
import { SettingsProfileContent } from "@/components/dashboard/settings/settings-profile-content";

const SettingsProfilePage = () => {
  return (
    <section className="relative pl-64">
      <SettingsAside activeKey="profile" />
      <div className="pl-6">
        <SettingsProfileContent />
      </div>
    </section>
  );
};

export default SettingsProfilePage;
