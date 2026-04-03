import {
  LayoutDashboard,
  Users,
  CreditCard,
  Cpu,
  AlertTriangle,
  BarChart3,
  FileText,
  HelpCircle,
  Mic,
  MessageSquare,
  PieChart,
  TrendingUp,
  DollarSign,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navigation: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "Users",
    items: [
      { title: "User Directory", href: "/users", icon: Users },
      { title: "Subscriptions", href: "/users/subscriptions", icon: CreditCard },
    ],
  },
  {
    title: "AI Pipeline",
    items: [
      { title: "Job Queue", href: "/ai-pipeline", icon: Cpu },
      { title: "Error Log", href: "/ai-pipeline/errors", icon: AlertTriangle },
      { title: "API Usage", href: "/ai-pipeline/usage", icon: BarChart3 },
    ],
  },
  {
    title: "Content",
    items: [
      { title: "Resources", href: "/content/resources", icon: FileText },
      { title: "Quiz Bank", href: "/content/quiz", icon: HelpCircle },
      { title: "Oral Exam", href: "/content/oral-exam", icon: Mic },
      { title: "Chatbot Config", href: "/content/chatbot", icon: MessageSquare },
    ],
  },
  {
    title: "Analytics",
    items: [
      { title: "Overview", href: "/analytics", icon: PieChart },
      { title: "Engagement", href: "/analytics/engagement", icon: TrendingUp },
      { title: "Revenue", href: "/analytics/revenue", icon: DollarSign },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
