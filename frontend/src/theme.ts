import { ThemeConfig } from 'antd/lib';
import { red } from '@ant-design/colors';

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: red[6],
    colorLink: red[5],
  },
  components: {
    Layout: {
      headerBg: red[6],
      headerColor: 'fff',
      footerBg: 'fff',
      siderBg: 'fff',
      bodyBg: 'fff',
    },
    Menu: {
      itemBg: 'fff',
      colorPrimaryHover: '#FFFFFF',
      colorPrimaryTextActive: '#FFFFFF',
      colorText: '#FFFFFF',
      colorPrimary: '#FFFFFF',
    },
  },
};

export const darkTheme: ThemeConfig = {};
