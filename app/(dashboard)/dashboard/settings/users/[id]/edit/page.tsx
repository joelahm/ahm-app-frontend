import { SettingsAside } from "@/components/dashboard/settings/settings-aside";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsUserEditContent } from "@/components/dashboard/settings/settings-user-edit-content";

interface SettingsEditUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

const SettingsEditUserPage = async ({ params }: SettingsEditUserPageProps) => {
  const { id } = await params;

  return (
    <section className="relative pl-64">
      <SettingsAdminOnlyGuard />
      <SettingsAside activeKey="users" />
      <div className="pl-6">
        <SettingsUserEditContent userId={id} />
      </div>
    </section>
  );
};

export default SettingsEditUserPage;
