import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import LoginView from '../views/auth/LoginView.vue'
import SignUpView from '../views/auth/SignUpView.vue'
import ProfileView from '../views/ProfileView.vue'
import ClubsView from '../views/ClubsView.vue'
import ClubDetailView from '../views/ClubDetailView.vue'
import { useAuth } from '../composables/useAuth.js'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/signup', name: 'signup', component: SignUpView },
    { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
    { path: '/clubs', name: 'clubs', component: ClubsView, meta: { requiresAuth: true } },
    { path: '/clubs/:id', name: 'club-detail', component: ClubDetailView, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
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
