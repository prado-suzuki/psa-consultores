import type { LucideIcon } from "lucide-react";

export interface DevHubOption {
  badge: string;
  description: string;
  highlights: string[];
  icon: LucideIcon;
  path: string;
  sopUrl?: string;
  title: string;
}

export interface DevHubDefinition {
  backLabel?: string;
  backPath?: string;
  heroDescription: string;
  heroEyebrow: string;
  heroIcon: LucideIcon;
  heroTitle: string;
  label: string;
  landingDescription: string;
  landingIcon: LucideIcon;
  landingPath: string;
  landingSopUrl?: string;
  options: DevHubOption[];
  subtitle: string;
  title: string;
}
