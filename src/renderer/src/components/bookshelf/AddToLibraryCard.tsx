type AddToLibraryCardProps = {
  onImport: () => Promise<void>
}

export function AddToLibraryCard({ onImport }: AddToLibraryCardProps) {
  return (
    <div>
      <button
        className="add-library-card"
        type="button"
        aria-label="Add a book to your library"
        onClick={() => void onImport()}
      >
        <span className="add-library-card__icon">
          <span className="material-symbols-outlined">add</span>
        </span>
        <span className="add-library-card__label">Add to Library</span>
      </button>
      <div className="add-library-card__placeholder">
        <strong>Placeholder</strong>
        <span>Placeholder</span>
      </div>
    </div>
  )
}
