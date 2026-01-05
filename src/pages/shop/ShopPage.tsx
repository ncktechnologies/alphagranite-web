import { Container } from '@/components/common/container';
import ShopTable from './components/table';

const ShopPage = () => {
    return (
        <div>
            <Container>
                <h1 className="text-2xl font-semibold mb-6">Shop Status</h1>
                <ShopTable />
            </Container>
        </div>
    );
}

export default ShopPage;