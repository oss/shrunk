export enum ReleaseCategory {
  IMPROVEMENTS = 'improvements',
  FEATURES = 'features',
  FIXES = 'fixes',
}

export interface Contributor {
  firstName: string;
  lastName: string;
  href?: string;
}

export type Product = 'website' | 'ms-office' | 'public-api';
export type ProductDisplay = Product | 'everything';

export interface Note {
  text: string;
  contributors: Contributor[];
  warning?: boolean;
  product?: Product;
}

export interface Release {
  major: number;
  minor: number;
  patch: number;
  description: string;
  categories: {
    [ReleaseCategory.FEATURES]: Note[];
    [ReleaseCategory.IMPROVEMENTS]: Note[];
    [ReleaseCategory.FIXES]: Note[];
  };
}
