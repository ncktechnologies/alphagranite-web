import { Container } from '@/components/common/container';
import { SETTINGS_NAV } from '@/config/menu.config';
import { Toolbar, ToolbarBreadcrumbs, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';

const PageMenu = () => {
  // const accountMenuConfig = SETTINGS_NAV;

  if (SETTINGS_NAV) {
    return (
      <>
        <Container className=''>
          <Toolbar className='flex flex-col items-start '>
            <ToolbarBreadcrumbs
              menu={SETTINGS_NAV}
              rootTitle="Settings"
              rootPath="/"
            />

            <ToolbarHeading title=" Settings" />


          </Toolbar>
        </Container>
        <Container className='mb-6'>

          {/* <Breadcrumb /> */}
          <NavbarMenu items={SETTINGS_NAV} />
        </Container>
      </>
    )
  } else {
    return <></>;
  }
};

export { PageMenu };