"use client"

import * as React from "react"
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  CalendarIcon,
  BuildingIcon,
} from "lucide-react"
import Link from "next/link"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin UTC Perlis",
    email: "admin@utc.perlis.gov.my",
    avatar: "/logo-utc-perlis.png",
  },
  navMain: [
    // {
    //   title: "Dashboard",
    //   url: "/admin/dashboard",
    //   icon: LayoutDashboardIcon,
    // },
    {
      title: "Pengurusan Tempahan",
      url: "/admin/bookings", 
      icon: CalendarIcon,
    },
    // {
    //   title: "Pengurusan Fasiliti",
    //   url: "/admin/facilities",
    //   icon: BuildingIcon,
    // },
    // {
    //   title: "Laporan",
    //   url: "/admin/reports",
    //   icon: BarChartIcon,
    // },
    // {
    //   title: "Pengguna",
    //   url: "/admin/users",
    //   icon: UsersIcon,
    // },
  ],
  navClouds: [
    {
      title: "Fasiliti",
      icon: BuildingIcon,
      isActive: false,
      url: "/admin/facilities",
      items: [
        {
          title: "Senarai Fasiliti",
          url: "/admin/facilities",
        },
        {
          title: "Tambah Fasiliti",
          url: "/admin/facilities/add",
        },
      ],
    },
    {
      title: "Tempahan",
      icon: CalendarIcon,
      url: "/admin/bookings",
      items: [
        {
          title: "Menunggu Kelulusan",
          url: "/admin/bookings?tab=pending",
        },
        {
          title: "Tempahan Lepas",
          url: "/admin/bookings?tab=past",
        },
      ],
    },
    {
      title: "Laporan",
      icon: FileTextIcon,
      url: "/admin/reports",
      items: [
        {
          title: "Laporan Tempahan",
          url: "/admin/reports/bookings",
        },
        {
          title: "Laporan Kewangan",
          url: "/admin/reports/revenue",
        },
      ],
    },
  ],
  navSecondary: [
    // {
    //   title: "Tetapan",
    //   url: "/admin/settings",
    //   icon: SettingsIcon,
    // },
    // {
    //   title: "Bantuan",
    //   url: "/admin/help",
    //   icon: HelpCircleIcon,
    // },
    // {
    //   title: "Carian",
    //   url: "/admin/search",
    //   icon: SearchIcon,
    // },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/admin/dashboard">
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">Admin UTC Perlis</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
