import {getCustomers} from '@/lib/actions/customers';
import {getSaleCategories} from '@/lib/actions/sale-settings';
import {getCustomerGrades} from '@/lib/actions/customer-grades';
import {CustomersClient} from './customers-client';

export default async function CustomersPage() {
  const [customers, categories, grades] = await Promise.all([
    getCustomers(),
    getSaleCategories(),
    getCustomerGrades(),
  ]);

  return (
    <CustomersClient
      initialCustomers={customers}
      initialCategories={categories}
      initialGrades={grades}
    />
  );
}
