export type SongTaxonomyKind = "theme" | "label";

export type SongTaxonomyItem = {
  id: string;
  name: string;
};

export type SongTaxonomies = {
  themes: SongTaxonomyItem[];
  labels: SongTaxonomyItem[];
};
