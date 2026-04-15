import { useTranslation } from '../../hooks/useTranslation'

type AddToLibraryCardProps = {
  onImport: () => Promise<void>
}

export function AddToLibraryCard({ onImport }: AddToLibraryCardProps) {
  const { t } = useTranslation()

  return (
    <div>
      <button
        className="add-library-card"
        type="button"
        aria-label={t('library.addAria')}
        onClick={() => void onImport()}
      >
        <span className="add-library-card__icon">
          <span className="material-symbols-outlined">add</span>
        </span>
        <span className="add-library-card__label">{t('library.addLabel')}</span>
      </button>
      <div className="add-library-card__placeholder">
        <strong>Placeholder</strong>
        <span>Placeholder</span>
      </div>
    </div>
  )
}
