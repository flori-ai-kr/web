import {getCustomers} from '@/lib/actions/customers';
import {getSaleCategories} from '@/lib/actions/sale-settings';
import {getCustomerGrades} from '@/lib/actions/customer-grades';
import {CustomersClient} from './customers-client';
import {GuideButton} from '@/components/guide/guide-button';

export default async function CustomersPage() {
  const [customers, categories, grades] = await Promise.all([
    getCustomers(),
    getSaleCategories(),
    getCustomerGrades(),
  ]);

  return (
    <div className="relative">
      <div className="absolute right-4 top-0 sm:right-6 z-10"><GuideButton slug="customers" /></div>
      <CustomersClient
        initialCustomers={customers}
        initialCategories={categories}
        initialGrades={grades}
      />
    </div>
  );
}
