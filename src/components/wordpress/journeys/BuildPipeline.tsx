'use client';

/**
 * 09 · Build & Deployment Experience — reference 83376, rendered honestly.
 *
 * The reference's pipeline composition — stage rail, orbital mark, checkpoint
 * panel, chevron flow and release row — with its fabricated telemetry removed.
 * No build runs from this planning studio, so no percentage, timer, version
 * or "Passed" badge is invented. Each stage is a real step of the engineering
 * KNOuX performs, selectable to read what actually happens in it; the release
 * row states the truth (nothing queued here) and routes to the Build division
 * where real operations and receipts live.
 */
import { useState } from 'react';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { WordPressCosmicMark } from '../WordPressCosmicMark';
import s from './journeys.module.css';

const STAGES = [
  {
    id: 'build', en: 'Build', ar: 'بناء',
    detail: 'The environment is prepared, dependencies resolved, and the site assembled against the agreed scope.',
    detailAr: 'تُجهَّز البيئة وتُحسم الاعتماديات ويُجمَّع الموقع وفق النطاق المتفق عليه.',
    checks: ['Environment prepared', 'Dependencies resolved', 'Baseline documented'],
  },
  {
    id: 'test', en: 'Test', ar: 'اختبار',
    detail: 'Behaviour is exercised: templates, forms, roles and the editorial flow, on real content.',
    detailAr: 'يُختبر السلوك: القوالب والنماذج والأدوار وتدفق التحرير، على محتوى حقيقي.',
    checks: ['Templates exercised', 'Forms and roles verified', 'Editorial flow walked'],
  },
  {
    id: 'validate', en: 'Validate', ar: 'تحقق',
    detail: 'Quality gates: code review, security hardening, performance measurement and dependency integrity.',
    detailAr: 'بوابات الجودة: مراجعة الكود والتصليب الأمني وقياس الأداء وسلامة الاعتماديات.',
    checks: ['Code quality review', 'Security hardening', 'Performance measured', 'Dependency integrity'],
  },
  {
    id: 'deploy', en: 'Deploy', ar: 'نشر',
    detail: 'A staged cutover to the agreed environment, with DNS, TLS and redirects verified before traffic moves.',
    detailAr: 'انتقال مرحلي إلى البيئة المتفق عليها، مع التحقق من DNS وTLS وإعادة التوجيه قبل نقل الزيارات.',
    checks: ['Staged cutover', 'DNS and TLS verified', 'Redirect map applied'],
  },
  {
    id: 'release', en: 'Release', ar: 'إصدار',
    detail: 'Handover with a change log, a restore drill and the operating agreement attached.',
    detailAr: 'تسليم مع سجل تغييرات وتجربة استعادة واتفاقية التشغيل مرفقة.',
    checks: ['Change log written', 'Restore drill recorded', 'Operating agreement attached'],
  },
] as const;

const PATHS = [
  { id: 'production', en: 'Production', ar: 'الإنتاج', meta: 'Primary · stable', metaAr: 'أساسي · مستقر' },
  { id: 'staging', en: 'Staging', ar: 'التجريب', meta: 'Pre-release · QA', metaAr: 'ما قبل الإصدار · جودة' },
  { id: 'development', en: 'Development', ar: 'التطوير', meta: 'Continuous · latest', metaAr: 'مستمر · الأحدث' },
] as const;

export function BuildPipeline() {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [stageId, setStageId] = useState<string>('validate');
  const [pathId, setPathId] = useState<string>('production');
  const stage = STAGES.find((entry) => entry.id === stageId) ?? STAGES[0];

  return (
    <section className={s.pipelineJourney} aria-label={t('Build and Deployment Experience')}>
      <div className={s.pipelineTop}>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Build Stages', 'مراحل البناء')}</h3>
          <ol className={s.stageList}>
            {STAGES.map((entry, index) => (
              <li key={entry.id}>
                <button type="button" className={s.layerRow} aria-pressed={stageId === entry.id}
                  onClick={() => { if (stageId !== entry.id) cueAtmosphere('confirm'); setStageId(entry.id); }}>
                  <span className={s.serviceCode}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={s.serviceName}>{t(entry.en, entry.ar)}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className={s.empty} aria-live="polite">{t(stage.detail, stage.detailAr)}</p>
        </div>

        <div className={s.opsCore} aria-hidden="true">
          <div className={s.infraCore}>
            <span className={s.infraRing} />
            <span className={s.infraRingB} />
            <WordPressCosmicMark className={s.infraMark} label="" />
            <span className={s.infraPodium} />
          </div>
        </div>

        <div className={s.pipelineSide}>
          <div className={s.panel}>
            <h3 className={s.panelTitle}>{t('Validation Checkpoints', 'نقاط التحقق')}</h3>
            <ul className={s.opsChecklist}>
              {stage.checks.map((check) => (
                <li key={check}><i aria-hidden="true">◇</i>{check}</li>
              ))}
            </ul>
            <p className={s.boundary}>{t('What this stage verifies in a real build — not results of a run. No check is marked passed here.', 'ما تتحقق منه هذه المرحلة في بناء حقيقي — وليست نتائج تشغيل. لا تُوسم أي نقطة هنا بالنجاح.')}</p>
          </div>
          <div className={s.panel}>
            <h3 className={s.panelTitle}>{t('Deployment Paths', 'مسارات النشر')}</h3>
            <div className={s.moduleRow} role="group" aria-label={t('Deployment paths')}>
              {PATHS.map((path) => (
                <button key={path.id} type="button" className={s.moduleChip} aria-pressed={pathId === path.id}
                  onClick={() => { if (pathId !== path.id) cueAtmosphere('settle'); setPathId(path.id); }}>
                  {t(path.en, path.ar)} · {t(path.meta, path.metaAr)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ol className={s.chevronFlow} aria-label={t('Pipeline order')}>
        {STAGES.map((entry) => (
          <li key={entry.id} data-active={stageId === entry.id}>
            <button type="button" onClick={() => { if (stageId !== entry.id) cueAtmosphere('settle'); setStageId(entry.id); }}>
              <b>{t(entry.en, entry.ar)}</b>
              <span>{t('Stage', 'مرحلة')} {STAGES.indexOf(entry) + 1}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className={s.pipelineStatus}>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Release Status', 'حالة الإصدار')}</h3>
          <p className={s.empty} role="status">
            {t('No pipeline is running from this studio. Builds execute in the Build division, where every operation carries a real receipt.', 'لا يعمل أي خط بناء من هذا الاستوديو. تُنفَّذ Builds في قسم البناء، حيث تحمل كل عملية إيصالاً حقيقياً.')}
          </p>
          <div className={s.actions}>
            <a className={s.ghostAction} href="/build/deployments">{t('Real deployment receipts', 'إيصالات النشر الحقيقية')} ↗</a>
            <a className={s.primaryAction} onClick={() => cueAtmosphere('success')}
              href={`/contact?${new URLSearchParams({ requestType: 'wordpress', items: `Build engagement: WordPress build and deployment; target path: ${pathId}; scope to be agreed` }).toString()}`}>
              {t('Request a build', 'اطلب بناءً')} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
