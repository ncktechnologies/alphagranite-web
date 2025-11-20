import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageMenu } from '@/pages/settings/page-menu';
import { PermissionsManagement } from './PermissionsManagement';

export const PermissionsSection = () => {
  return (
    <Fragment>
      <PageMenu />
      <Container>
        <PermissionsManagement />
      </Container>
    </Fragment>
  );
};