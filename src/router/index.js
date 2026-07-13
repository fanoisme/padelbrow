import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import LoginView from '../views/auth/LoginView.vue'
import { useAuth } from '../composables/useAuth.js'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
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
