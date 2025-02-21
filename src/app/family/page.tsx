import { SidebarLayout } from "@/components/layouts/sidebar-layout"

const Family = () => {
  return (
    <SidebarLayout
      breadcrumbItems={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/family", label: "Family" }
      ]}
    >
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </SidebarLayout>
  )
}

export default Family