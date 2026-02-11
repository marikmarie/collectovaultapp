declare module 'lucide-react-native' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface IconProps extends ViewProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number;
  }

  export const Award: ComponentType<IconProps>;
  export const TrendingUp: ComponentType<IconProps>;
  export const RefreshCw: ComponentType<IconProps>;
  export const ShoppingCart: ComponentType<IconProps>;
  export const Check: ComponentType<IconProps>;
  export const Gift: ComponentType<IconProps>;
  export const LogIn: ComponentType<IconProps>;
  export const FileText: ComponentType<IconProps>;
  export const Filter: ComponentType<IconProps>;
  export const Download: ComponentType<IconProps>;
  export const X: ComponentType<IconProps>;
  export const Search: ComponentType<IconProps>;
  export const ArrowDownLeft: ComponentType<IconProps>;
  export const ArrowUpRight: ComponentType<IconProps>;
}
