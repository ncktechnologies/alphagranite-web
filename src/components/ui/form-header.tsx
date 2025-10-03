interface Props {
    title: string;
    caption: string;
}

export const FormHeader = ({title, caption}: Props) => {
    return (
        <div className="w-full max-w-[367px] text-center mb-7">
            <h5 className="text-[32px] text-text mt-2 font-normal">{title}</h5>
            <p className="text-text-foreground text-[14px]">{caption}</p>
        </div>
    )
}