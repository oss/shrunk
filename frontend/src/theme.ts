import { theme, ThemeConfig } from 'antd';
import { red } from '@ant-design/colors';

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: red[6],
    colorLink: red[5],
    fontFamily: 'Geist',
    colorText: '#000000', // ✅ Global text color
    colorTextBase: '#000000', // ✅ Base text color
  },
  components: {
    Dropdown: {
      colorText: '#000000',
      colorTextDescription: '#000000',
      controlItemBgActive: '#f5f5f5',
      controlItemBgHover: '#fafafa',
    },
    Table: {
      cellFontSize: 14,
      filterDropdownBg: '#FFFFFF',
      filterDropdownMenuBg: '#FFFFFF',
      colorText: '#000000',
      colorTextHeading: '#000000',
    },
    Checkbox: {
      // ✅ Fixes checkbox labels
      colorText: '#000000',
      colorTextDisabled: '#999999',
    },
    Button: {
      // ✅ Fixes Reset/OK buttons
      colorText: '#000000',
      colorPrimaryHover: red[5],
    },
    Layout: {
      headerBg: red[6],
      headerColor: '#fff',
      footerBg: '#fff',
      siderBg: '#fff',
      bodyBg: '#fff',
    },
    Menu: {
      itemBg: '#fff',
      colorPrimaryHover: '#FFFFFF',
      colorPrimaryTextActive: '#FFFFFF',
      colorText: '#000000',
      colorPrimary: '#FFFFFF',
    },
    Tabs: {
      itemHoverColor: red[6],
      itemSelectedColor: red[6],
      itemActiveColor: red[6],
    },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: red[6],
    colorLink: red[5],
    fontFamily: 'Geist',
    colorBgBase: '#141414', // Dark background
    colorTextBase: '#ffffff', // Light text
    colorBgContainer: '#1f1f1f', // Container background
    colorBorder: '#434343', // Border color
    colorBgElevated: '#262626', // Elevated surfaces (modals, dropdowns)
  },
  components: {
    Tooltip: {
      colorBgSpotlight: '#FFFFFf',
      colorTextLightSolid: '#1f1f1f',
    },
    Table: {
      cellFontSize: 14,
      colorBgContainer: '#1f1f1f',
      colorText: '#ffffff',
      headerBg: '#262626',
      headerColor: '#ffffff',
      rowHoverBg: '#262626',
      // filterDropdownBg: '',
      filterDropdownMenuBg: '#262626',
    },
    Layout: {
      headerBg: '#141414',
      headerColor: '#ffffff',
      footerBg: '#141414',
      siderBg: '#1f1f1f',
      bodyBg: '#1f1f1f',
    },
    Dropdown: {
      colorBgElevated: '#262626',
      colorText: '#ffffff',
      controlItemBgActive: '#303030',
      controlItemBgHover: '#303030',
      paddingBlock: 8,
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#ffffff',
      itemHoverBg: '#303030',
      itemHoverColor: '#ffffff',
      itemActiveBg: '#1f1f1f',
      itemSelectedBg: '#1f1f1f',
      itemSelectedColor: '#ffffff',
      iconSize: 16,
      iconMarginInlineEnd: 12,
    },
    Tabs: {
      itemHoverColor: red[5],
      itemSelectedColor: red[6],
      itemActiveColor: red[6],
      cardBg: '#1f1f1f',
    },
    Card: {
      colorBgContainer: '#1f1f1f',
      colorText: '#ffffff',
      colorTextHeading: '#ffffff',
    },
    Input: {
      colorBgContainer: '#262626',
      colorText: '#ffffff',
      colorBorder: '#434343',
      activeBorderColor: red[6],
      hoverBorderColor: red[5],
    },
    Select: {
      colorBgContainer: '#262626',
      colorText: '#ffffff',
      colorBorder: '#434343',
      optionSelectedBg: '#262626',
    },
    Button: {
      defaultBg: '#262626',
      defaultColor: '#ffffff',
      defaultBorderColor: '#434343',
      defaultHoverBg: '#303030',
      defaultHoverColor: '#ffffff',
      defaultHoverBorderColor: red[5],
      defaultBgDisabled: '##696969',
    },
    Modal: {
      contentBg: '#1f1f1f',
      headerBg: '#262626',
    },
    Drawer: {
      colorBgElevated: '#1f1f1f',
    },
  },
};
