import { NavLink } from 'react-router-dom'

function SidebarLink({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded-lg px-4 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-slate-800 text-white'
            : 'text-slate-700 hover:bg-slate-200'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export default SidebarLink
