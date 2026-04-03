type BookshelfHeaderProps = {
  onImport: () => Promise<void>
}

export function BookshelfHeader({ onImport }: BookshelfHeaderProps) {
  return (
    <header className="bookshelf-header">
      <div>
        <p className="bookshelf-header__eyebrow">Ghost Reader</p>
        <h1>Bookshelf</h1>
      </div>
      <button className="bookshelf-header__action" onClick={() => void onImport()}>
        Import Books
      </button>
    </header>
  )
}
