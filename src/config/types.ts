import { RemixiconComponentType } from '@remixicon/react';
import { type LucideIcon } from 'lucide-react';

export interface MenuItem {
  title?: string;
  icon?: LucideIcon | RemixiconComponentType | string;
  path?: string;
  rootPath?: string;
  childrenIndex?: number;
  heading?: string;
  children?: MenuConfig;
  disabled?: boolean;
  collapse?: boolean;
  collapseTitle?: string;
  expandTitle?: string;
  badge?: string;
  separator?: boolean;
}

export type MenuConfig = MenuItem[];

export interface Settings {
  container: 'fixed' | 'fluid';
  layout: string;
  layouts: {
    demo1: {
      sidebarCollapse: boolean;
      sidebarTheme: 'light' | 'dark';
    };
    demo2: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
    demo5: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
    demo7: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
    demo9: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
  };
}

// types/role.ts
export interface Role {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  members: number;
  avatars: string[];
}
export interface Station {
  id: string;
  workstationName: string;
  description?: string;
  status?: 'Active' | 'Inactive';
  members?: number;
  avatars?: string[];
  machine?: string
  operators?: string[]
  other?:string
}


export type ViewMode = 'details' | 'new' | 'edit' | 'list';

export interface Permission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface Permissions {
  [key: string]: Permission;
}