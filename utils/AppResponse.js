

export const AppResponse = {
    success: (res, message,  data) => {
        res.status(200).json({message, data});
    },
    error: (res, message) => {
       res.status(400) 
       throw new Error(message)
    },
    notFound: (res) => {
        res.status(404).json({ error: 'Not Found' });
    }
}