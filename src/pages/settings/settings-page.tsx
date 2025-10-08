import { SETTINGS_NAV } from '@/config/menu.config';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';

const SettingsPage = () => {
  // const accountMenuConfig = SETTINGS_NAV;

  if (SETTINGS_NAV) {
    return <NavbarMenu items={SETTINGS_NAV} />;
  } else {
    return <></>;
  }
};

export { SettingsPage };