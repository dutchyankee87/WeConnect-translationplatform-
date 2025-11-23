import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null

  let user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1)

  if (user.length === 0) {
    // User doesn't exist in our DB, sync from Clerk
    const clerkUser = await currentUser()
    if (!clerkUser) return null

    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
        role: 'creator', // Default role
      })
      .returning()

    return newUser
  }

  return user[0]
}

export async function getUserRole() {
  const user = await getCurrentUser()
  return user?.role
}

export async function hasRole(allowedRoles: string[]) {
  const role = await getUserRole()
  return role ? allowedRoles.includes(role) : false
}