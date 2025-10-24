export const setCookies = (res, name, value) => {

    res.cookie(name, value, 
        {
            maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
            sameSite: "none",
            secure: true,
            httpOnly: true
        }
    )
}