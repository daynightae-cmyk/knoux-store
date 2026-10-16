import 'server-only';
import { allEntities } from '@/data/composer-rules';
import { divisions } from '@/lib/entities';
import { publicCatalog } from './guide';
import { publicBuildGuide } from './public-build-guide';

export const companionCatalog=[...publicCatalog([...allEntities,...divisions.map(division=>({id:`division-${division.id}`,name:division.label,shortName:division.label,summary:division.statement,route:division.route,division:division.id,kind:'route' as const,code:division.index,slug:division.id,status:'active' as const,categories:[],searchTerms:[division.label,division.id],capabilities:[],relatedIds:[]}))]),...publicBuildGuide];
