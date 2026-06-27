## 1. Relocate and Style Navigation Logout Button

- [x] 1.1 Replace the raw `<button>` element inside `app/components/AmI/NavBar.vue` for the logout action with the custom `<AmIButton>` component.
- [x] 1.2 Wire the props `bg-colour="bg-slate-500"` and `animation-colour="bg-slate-400"` to the new `<AmIButton>` component.
- [x] 1.3 Update the text interpolation to use `{{ $t('common.logout') }}`.
- [x] 1.4 Apply flex/margin styling (like `md:ml-auto`) to position the logout button on the far right of the desktop menu while keeping it at the bottom of the mobile list.
- [x] 1.5 Run build, format, and lint checks to ensure all modifications compile cleanly.
