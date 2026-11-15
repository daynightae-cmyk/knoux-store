/**
 * Command Center — navigation re-exports.
 *
 * The area registry lives in `src/data/growth/areas.ts` because the site
 * navigation needs it for breadcrumbs and a data module must not import a
 * component module. This file is the component-layer entry point, so the rest of
 * `src/components/command/**` keeps importing from one place.
 */

export {
  COMMAND_AREAS,
  COMMAND_AREAS_BY_SLUG,
  COMMAND_GROUPS,
  DOCK_ACTIONS,
  areaBySlug,
  areaHref,
  type CommandArea,
  type CommandGroup,
  type DockAction,
} from '@/data/growth/areas';