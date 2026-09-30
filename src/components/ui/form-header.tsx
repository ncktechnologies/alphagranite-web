interface Props {
    title: string;
    caption: string;
    width?: string;
}

export const FormHeader = ({title, caption, width="367"}: Props) => {
    return (
        <div className={`w-full max-w-${width} text-center mb-7`}>
            <h5 className="text-[34px] text-text mt-2 font-normal">{title}</h5>
            <p className="text-text-foreground text-[16px]">{caption}</p>
        </div>
    )
}