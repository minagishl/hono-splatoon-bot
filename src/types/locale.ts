// Common item type (only name property)
export interface Item {
	name: string;
}

// Team type: team name
export interface Team {
	teamName: string;
}

// Festival type: title and an array of participating teams
export interface Festival {
	title: string;
	teams: Team[];
}

// Event type: Event name, description, and regulation details
export interface Event {
	name: string;
	desc: string;
	regulation: string;
}

// Generic type for mapping items by ID
export type IDMap<T> = {
	[id: string]: T;
};

export interface Locale {
	gear: IDMap<Item>;
	festivals: IDMap<Festival>;
	stages: IDMap<Item>;
	rules: IDMap<Item>;
	weapons: IDMap<Item>;
	bosses: IDMap<Item>;
	events: IDMap<Event>;
	brands: IDMap<Item>;
	powers: IDMap<Item>;
}
