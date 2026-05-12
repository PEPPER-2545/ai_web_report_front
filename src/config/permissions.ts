export const rolePermissions: Record<string, string[]> = {
    // Admin wildcard: full access to everything
    admin: ['*'],

    // MIOC: only access to MIOC menu and APIs
    mioc: [
        'menu.mioc',
        'api.mioc.*',
    ],

    implement_engineer: [
        'menu.mettpole',
        'api.mettpole.*',
        'menu.mettforce',
        'api.mettforce.*',
        'menu.mroi',
        'api.mroi.*',
    ],
    service_engineer: [
        'menu.mettbot',
        'api.mettbot.*',
    ],
};

export default rolePermissions;
