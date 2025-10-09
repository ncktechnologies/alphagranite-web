import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Fragment } from 'react';
import { PageMenu } from '../page-menu';
import { Container } from '@/components/common/container';

const NotificationsSection = () => {
  return (
    <Fragment>
      <PageMenu />

      <Container>
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
          </CardHeader>
          <CardContent>
          </CardContent>
        </Card>
      </Container>
    </Fragment>
  );
};

export { NotificationsSection };