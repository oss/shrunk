import { ThemeConfig } from 'antd/lib';

const primaryColor = '#cc0033';
const secondaryColor = '#407aaa';
const color3 = '#121212';
const color4 = '#a2a2a2';

const shrunkTheme: ThemeConfig = {
  token: {
    colorPrimary: primaryColor,
    colorLink: secondaryColor,
    colorBgLayout: secondaryColor,
  },
  components: {
    Layout: {
      headerBg: primaryColor,
      footerBg: color3,
    },
    Menu: {
      darkItemBg: primaryColor,
    },
  },
};

export default shrunkTheme;
