import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/auth/LoginView.vue') },
    { path: '/signup', name: 'signup', component: () => import('../views/auth/SignUpView.vue') },
    { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/clubs', name: 'clubs', component: () => import('../views/ClubsView.vue'), meta: { requiresAuth: true } },
    { path: '/clubs/:id', name: 'club-detail', component: () => import('../views/ClubDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/network', name: 'network', component: () => import('../views/NetworkView.vue'), meta: { requiresAuth: true } },
    { path: '/meets', name: 'meets', component: () => import('../views/meets/MeetsListView.vue'), meta: { requiresAuth: true } },
    { path: '/meets/new', name: 'meet-new', component: () => import('../views/meets/CreateMeetView.vue'), meta: { requiresAuth: true } },
    { path: '/meets/:id', name: 'meet-detail', component: () => import('../views/meets/MeetDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/competitions', name: 'competitions', component: () => import('../views/competitions/CompetitionsListView.vue'), meta: { requiresAuth: true } },
    { path: '/competitions/new', name: 'competition-new', component: () => import('../views/competitions/CreateCompetitionView.vue'), meta: { requiresAuth: true } },
    { path: '/competitions/:id', name: 'competition-detail', component: () => import('../views/competitions/CompetitionDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/feed', name: 'feed', component: () => import('../views/feed/FeedView.vue'), meta: { requiresAuth: true } },
    { path: '/clubs/:id/feed', name: 'club-feed', component: () => import('../views/feed/FeedView.vue'), meta: { requiresAuth: true }, props: (route) => ({ clubId: route.params.id }) },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') }
  ]
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const { user } = useAuth()
    if (!user.value) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
})

export default router
