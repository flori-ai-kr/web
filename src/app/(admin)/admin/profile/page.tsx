import { getProfile } from '@/lib/actions/profile'
import { ProfileClient } from './profile-client'

export default async function ProfilePage() {
  const profile = await getProfile()
  return <ProfileClient profile={profile} />
}
