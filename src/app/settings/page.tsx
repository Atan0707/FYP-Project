import { AppLayout } from "@/components/layouts/app-layout"

export default function SettingsPage() {
  return (
    <AppLayout
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        { label: "Profile", isCurrentPage: true }
      ]}
    >
      {/* Your settings page content */}
    </AppLayout>
  )
} 