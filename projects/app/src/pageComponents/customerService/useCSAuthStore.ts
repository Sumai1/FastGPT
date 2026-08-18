import { create, devtools, persist, immer } from '@fastgpt/web/common/zustand';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';

/**
 * Customer service user account type
 */
export type CSUserAccount = {
  id: string;
  name: string;
  email: string;
  role: CustomerServiceMemberRoleEnum;
  avatar: string;
};

/**
 * Demo accounts for customer service roles
 */
export const CS_DEMO_ACCOUNTS: CSUserAccount[] = [
  {
    id: 'cs-admin-001',
    name: '张管理',
    email: 'admin@cs.demo',
    role: CustomerServiceMemberRoleEnum.customerServiceAdmin,
    avatar: '🛡️'
  },
  {
    id: 'cs-editor-001',
    name: '李采编',
    email: 'editor@cs.demo',
    role: CustomerServiceMemberRoleEnum.knowledgeEditor,
    avatar: '📝'
  },
  {
    id: 'cs-reviewer-001',
    name: '王审核',
    email: 'reviewer@cs.demo',
    role: CustomerServiceMemberRoleEnum.knowledgeReviewer,
    avatar: '🔍'
  }
];

/**
 * Helper to get default route by role
 * @param role The user role
 * @returns The default route path
 */
export const getDefaultRouteForRole = (role: CustomerServiceMemberRoleEnum): string => {
  switch (role) {
    case CustomerServiceMemberRoleEnum.customerServiceAdmin:
      return '/customer-service/console';
    case CustomerServiceMemberRoleEnum.knowledgeEditor:
      return '/customer-service/editor';
    case CustomerServiceMemberRoleEnum.knowledgeReviewer:
      return '/customer-service/reviewer';
    default:
      return '/customer-service/login';
  }
};

type CSAuthStore = {
  currentUser: CSUserAccount | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => boolean;
  loginAs: (account: CSUserAccount) => void;
  logout: () => void;
};

/**
 * Zustand store for customer service authentication
 */
export const useCSAuthStore = create<CSAuthStore>()(
  devtools(
    persist(
      immer((set) => ({
        currentUser: null,
        isLoggedIn: false,
        login: (email, password) => {
          if (!password) return false;
          const account = CS_DEMO_ACCOUNTS.find((acc) => acc.email === email);
          if (account) {
            set((state) => {
              state.currentUser = account;
              state.isLoggedIn = true;
            });
            return true;
          }
          return false;
        },
        loginAs: (account) => {
          set((state) => {
            state.currentUser = account;
            state.isLoggedIn = true;
          });
        },
        logout: () => {
          set((state) => {
            state.currentUser = null;
            state.isLoggedIn = false;
          });
        }
      })),
      {
        name: 'csAuthStore',
        partialize: (state) => ({
          currentUser: state.currentUser
        }),
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          isLoggedIn: !!persistedState?.currentUser
        })
      }
    )
  )
);
